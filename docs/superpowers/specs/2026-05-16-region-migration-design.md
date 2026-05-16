# Region Migration: us-east-1 → ap-southeast-1

**Date:** 2026-05-16  
**Status:** Infrastructure provisioned. Code changes pending.

## Context

The us-east-1 EKS stack was broken and unreachable. `terraform destroy` has been run against us-east-1 and `terraform apply` has been run for ap-southeast-1. All AWS resources (EKS, ECR, EFS, SSM parameters) now exist in ap-southeast-1. The app has not been deployed yet — that happens when these code changes are committed and pushed to `main`.

## Approach

Option A — Destroy then re-apply. Infrastructure already complete. Only code changes remain.

## Changes Required

### 1. `.github/workflows/deploy.yml`
- Line 12: `AWS_REGION: us-east-1` → `AWS_REGION: ap-southeast-1`
- No other changes. IAM role ARN is global and unchanged. SSM reads, ECR login, EKS kubeconfig all derive from `AWS_REGION` at runtime.

### 2. `infra/variables.tf`
- `default = "us-east-1"` → `default = "ap-southeast-1"` for the `aws_region` variable.

### 3. `infra/main.tf`
- Update the commented-out S3 backend block: `region = "us-east-1"` → `region = "ap-southeast-1"` for consistency.

### 4. `infra/terraform.tfvars`
- Remove the `anthropic_api_key` line entirely. The key is passed via `TF_VAR_anthropic_api_key` environment variable at apply time.

### 5. `.gitignore`
- Add `infra/terraform.tfvars` to prevent secrets from being committed.
- Add `infra/*.tfvars` (catch-all) and `infra/.terraform/` if not already present.

### 6. `infra/terraform.tfvars.example` (new file)
- Document required variables with placeholder values so future contributors know what to set.

## Secrets Layout

| Secret | Where | Who creates it |
|---|---|---|
| `ANTHROPIC_API_KEY` | GitHub Actions secret | Manual (already done) |
| `/silver/ANTHROPIC_API_KEY` | AWS SSM SecureString | `terraform apply` (already done) |
| `/silver/ECR_BACKEND` | AWS SSM String | `terraform apply` (already done) |
| `/silver/ECR_FRONTEND` | AWS SSM String | `terraform apply` (already done) |
| `/silver/EFS_ID` | AWS SSM String | `terraform apply` (already done) |
| `/silver/ALB_DNS` | AWS SSM String | First successful deploy |

No AWS credentials stored in GitHub. OIDC handles authentication.

## Deployment Flow (after this PR merges)

1. Push to `main` triggers `deploy.yml`
2. OIDC authenticates to AWS in ap-southeast-1
3. Workflow reads ECR URLs, EFS ID, Anthropic key from SSM
4. Builds and pushes backend + frontend images to ECR
5. Updates kubeconfig for the ap-southeast-1 EKS cluster
6. Applies K8s manifests (DB, backend, frontend, ingress)
7. Waits for rollouts, then writes ALB DNS back to SSM

## What Does Not Change

- K8s manifests (`k8s/`) — no region-specific content
- `deploy.yml` `AWS_ROLE_ARN` — IAM is global; same ARN after destroy+recreate
- CI workflow (`ci.yml`) — reads `ANTHROPIC_API_KEY` from GitHub secret, no AWS dependency
- All Terraform resource definitions — already use `var.aws_region` dynamically

## Out of Scope

- S3 remote state backend — not needed, Terraform runs manually from local machine
- CockroachDB data migration — safe to re-seed from CSVs on first boot
