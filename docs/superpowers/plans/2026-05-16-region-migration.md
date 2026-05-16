# Region Migration: us-east-1 → ap-southeast-1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update all hardcoded `us-east-1` references to `ap-southeast-1` and remove the plaintext API key from `terraform.tfvars` so the GitHub Actions deploy workflow connects to the already-provisioned ap-southeast-1 infrastructure.

**Architecture:** Infrastructure is already live in ap-southeast-1 (terraform destroy + apply already run). Only code changes remain. Pushing to `main` after these changes triggers the deploy workflow which reads ECR URLs, EFS ID, and the Anthropic key from SSM in ap-southeast-1.

**Tech Stack:** GitHub Actions, Terraform HCL, AWS EKS / ECR / EFS / SSM

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `.github/workflows/deploy.yml` | `AWS_REGION: us-east-1` → `ap-southeast-1` |
| Modify | `infra/variables.tf` | `default = "us-east-1"` → `"ap-southeast-1"` |
| Modify | `infra/main.tf` | Commented S3 backend `region = "us-east-1"` → `"ap-southeast-1"` |
| Modify | `infra/terraform.tfvars` | Remove `anthropic_api_key` line |
| Create | `infra/terraform.tfvars.example` | Placeholder values documenting required vars |

---

### Task 1: Update deploy workflow region

**Files:**
- Modify: `.github/workflows/deploy.yml:12`

- [ ] **Step 1: Edit the region env var**

In `.github/workflows/deploy.yml`, change line 12:

```yaml
# Before
  AWS_REGION:   us-east-1

# After
  AWS_REGION:   ap-southeast-1
```

- [ ] **Step 2: Verify the change is correct**

Run:
```bash
grep -n "AWS_REGION\|us-east-1\|ap-southeast" .github/workflows/deploy.yml
```

Expected output:
```
12:  AWS_REGION:   ap-southeast-1
```

No remaining `us-east-1` references should appear.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "fix: update deploy workflow region to ap-southeast-1"
```

---

### Task 2: Update Terraform variable default

**Files:**
- Modify: `infra/variables.tf:4`

- [ ] **Step 1: Edit the default value**

In `infra/variables.tf`, change the `aws_region` default:

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}
```

- [ ] **Step 2: Verify**

Run:
```bash
grep -n "us-east-1\|ap-southeast" infra/variables.tf
```

Expected output:
```
4:  default     = "ap-southeast-1"
```

- [ ] **Step 3: Commit**

```bash
git add infra/variables.tf
git commit -m "fix: update Terraform aws_region default to ap-southeast-1"
```

---

### Task 3: Update commented S3 backend region

**Files:**
- Modify: `infra/main.tf:21`

- [ ] **Step 1: Edit the commented backend block**

In `infra/main.tf`, update the commented-out backend block:

```hcl
  # backend "s3" {
  #   bucket         = "silver-terraform-state"
  #   key            = "silver/terraform.tfstate"
  #   region         = "ap-southeast-1"
  #   dynamodb_table = "silver-terraform-locks"
  # }
```

- [ ] **Step 2: Verify**

Run:
```bash
grep -n "us-east-1\|ap-southeast" infra/main.tf
```

Expected output:
```
23:#   region         = "ap-southeast-1"
```

- [ ] **Step 3: Commit**

```bash
git add infra/main.tf
git commit -m "fix: update commented S3 backend region to ap-southeast-1"
```

---

### Task 4: Remove plaintext API key from terraform.tfvars

**Files:**
- Modify: `infra/terraform.tfvars`

- [ ] **Step 1: Remove the anthropic_api_key line**

In `infra/terraform.tfvars`, remove the `anthropic_api_key` line. The file should contain only:

```hcl
aws_region         = "ap-southeast-1"
cluster_name       = "silver"
node_instance_type = "t3.medium"
node_desired_size  = 2
node_min_size      = 1
node_max_size      = 4
```

- [ ] **Step 2: Verify no secret remains**

Run:
```bash
grep -n "anthropic\|sk-ant" infra/terraform.tfvars
```

Expected output: no output (empty).

- [ ] **Step 3: Confirm file is gitignored**

Run:
```bash
git check-ignore -v infra/terraform.tfvars
```

Expected output:
```
.gitignore:N:terraform.tfvars	infra/terraform.tfvars
```

(N = the line number of the matching pattern — confirms the file is ignored.)

- [ ] **Step 4: Commit**

`infra/terraform.tfvars` is gitignored so git won't track it — nothing to stage for that file. Just confirm:

```bash
git status infra/terraform.tfvars
```

Expected: file not listed (ignored).

No commit needed for this step — the file is local-only.

---

### Task 5: Create terraform.tfvars.example

**Files:**
- Create: `infra/terraform.tfvars.example`

- [ ] **Step 1: Create the example file**

Create `infra/terraform.tfvars.example` with the following content:

```hcl
aws_region         = "ap-southeast-1"
cluster_name       = "silver"
node_instance_type = "t3.medium"
node_desired_size  = 2
node_min_size      = 1
node_max_size      = 4

# Obtain from Anthropic console — https://console.anthropic.com/
# Pass as env var instead of setting here: export TF_VAR_anthropic_api_key="sk-ant-..."
# anthropic_api_key = "sk-ant-REPLACE_ME"
```

- [ ] **Step 2: Verify the example file has no real secrets**

Run:
```bash
grep -n "sk-ant" infra/terraform.tfvars.example
```

Expected output: the placeholder line only (commented out, contains `REPLACE_ME` not a real key).

- [ ] **Step 3: Commit**

```bash
git add infra/terraform.tfvars.example
git commit -m "chore: add terraform.tfvars.example, remove plaintext API key from tfvars"
```

---

### Task 6: Push to main and verify deploy

- [ ] **Step 1: Check all us-east-1 references are gone from tracked files**

Run:
```bash
git grep "us-east-1"
```

Expected output: no output. If any matches appear, fix them before pushing.

- [ ] **Step 2: Push to main**

```bash
git push origin main
```

- [ ] **Step 3: Monitor the deploy workflow**

Open GitHub → Actions → "Deploy to EKS" → watch the run triggered by this push.

Key steps to watch:
- `Configure AWS credentials (OIDC)` — confirms ap-southeast-1 auth works
- `Read config from SSM` — confirms SSM params exist in ap-southeast-1
- `Build and push backend` / `Build and push frontend` — confirms ECR repos accessible
- `Wait for backend rollout` — may take up to 600s on first deploy (DB seeding)
- `Store ALB DNS in SSM` — final step; once done, the app is accessible

- [ ] **Step 4: Get the ALB DNS**

Once the deploy workflow completes, run locally:

```bash
aws eks update-kubeconfig --region ap-southeast-1 --name silver
kubectl get ingress silver-ingress -n silver -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

Expected: an ALB hostname like `k8s-silver-....ap-southeast-1.elb.amazonaws.com`

Open that URL in a browser to verify the app loads.
