output "cluster_name" {
  value = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "ecr_backend_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  value = aws_ecr_repository.frontend.repository_url
}

output "efs_file_system_id" {
  description = "Needed for the Kubernetes PersistentVolume — also stored in SSM at /silver/EFS_ID"
  value       = aws_efs_file_system.cockroach.id
}

output "github_actions_access_key_id" {
  description = "Add as AWS_ACCESS_KEY_ID in GitHub secrets"
  value       = aws_iam_access_key.github_actions.id
}

output "github_actions_secret_access_key" {
  description = "Add as AWS_SECRET_ACCESS_KEY in GitHub secrets"
  value       = aws_iam_access_key.github_actions.secret
  sensitive   = true
}

output "alb_controller_role_arn" {
  description = "Pass to the aws-load-balancer-controller Helm chart as serviceAccount.annotations"
  value       = aws_iam_role.alb_controller.arn
}

output "kubeconfig_command" {
  description = "Run this after apply to configure kubectl locally"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}"
}
