# Deployment Guide

The app runs on AWS EKS in `ap-southeast-1`. GitHub Actions handles app deployments automatically on every push to `main`. Terraform infrastructure is provisioned manually.

---

## Overview

| Layer | What it is | How it's managed |
|---|---|---|
| Infrastructure (VPC, EKS, ECR, EFS, SSM) | AWS resources | Terraform — run manually once |
| AWS Load Balancer Controller | Kubernetes add-on | Helm — run manually after each `terraform apply` |
| App deployment (backend + frontend) | Docker images → K8s | GitHub Actions — runs on every push to `main` |

---

## 1. Prerequisites (one-time)

- AWS CLI configured with credentials for account `196511141455`
- `terraform` >= 1.5
- `kubectl`
- `helm`
- GitHub secret `ANTHROPIC_API_KEY` set in the repo (Settings → Secrets → Actions)

---

## 2. Provision infrastructure

```bash
cd infra
export TF_VAR_anthropic_api_key="sk-ant-..."   # from console.anthropic.com
terraform init
terraform apply
```

Terraform creates: VPC, EKS cluster, ECR repos (backend + frontend), EFS volume for CockroachDB, IAM roles (OIDC for GitHub Actions + ALB controller + EFS CSI driver), and all SSM parameters.

Update your local kubeconfig after apply:

```bash
aws eks update-kubeconfig --region ap-southeast-1 --name silver
```

---

## 3. Install the AWS Load Balancer Controller

**This step is required after every `terraform apply` that creates a new cluster.** Terraform creates the IAM role for the controller but does not install it — that's a Helm step.

Get the VPC ID from Terraform outputs:

```bash
terraform output   # look for cluster_name and alb_controller_role_arn
aws eks describe-cluster --name silver --region ap-southeast-1 \
  --query "cluster.resourcesVpcConfig.vpcId" --output text
```

Install:

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=silver \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set "serviceAccount.annotations.eks\.amazonaws\.com/role-arn=arn:aws:iam::196511141455:role/silver-alb-controller" \
  --set region=ap-southeast-1 \
  --set vpcId=<VPC_ID_FROM_ABOVE>
```

Verify the controller is running:

```bash
kubectl rollout status deployment/aws-load-balancer-controller -n kube-system
```

---

## 4. Deploy the app

Push to `main` and GitHub Actions does the rest:

```bash
git push origin main
```

The workflow (`.github/workflows/deploy.yml`) will:
1. Authenticate to AWS via OIDC (no stored credentials)
2. Read ECR URLs, EFS ID, and Anthropic key from SSM
3. Build and push backend + frontend Docker images to ECR
4. Apply all Kubernetes manifests (`k8s/`)
5. Wait for rollouts (up to 10 min on first deploy — DB seeds ~144k rows)
6. Write the ALB DNS back to SSM for future builds

Monitor the run at: GitHub → Actions → "Deploy to EKS"

---

## 5. Get the app URL

```bash
kubectl get ingress silver-ingress -n silver \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

The ALB takes 2–3 minutes to provision after the first deploy. Open the hostname in a browser on port 80.

---

## Secrets reference

| Secret | Where | Who creates it |
|---|---|---|
| `ANTHROPIC_API_KEY` | GitHub Actions secret | Manual (one-time) |
| `/silver/ANTHROPIC_API_KEY` | AWS SSM SecureString | `terraform apply` |
| `/silver/ECR_BACKEND` | AWS SSM String | `terraform apply` |
| `/silver/ECR_FRONTEND` | AWS SSM String | `terraform apply` |
| `/silver/EFS_ID` | AWS SSM String | `terraform apply` |
| `/silver/ALB_DNS` | AWS SSM String | First successful deploy |

Never put secrets in `infra/terraform.tfvars`. Pass the Anthropic key via `TF_VAR_anthropic_api_key` environment variable instead. See `infra/terraform.tfvars.example`.

---

## Tearing down

```bash
cd infra
export TF_VAR_anthropic_api_key="sk-ant-..."
terraform destroy
```

This removes all AWS resources. The local `terraform.tfstate` file is preserved so you can re-provision cleanly with `terraform apply`.
