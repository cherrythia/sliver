resource "aws_ssm_parameter" "anthropic_api_key" {
  name  = "/silver/ANTHROPIC_API_KEY"
  type  = "SecureString"
  value = var.anthropic_api_key
}

resource "aws_ssm_parameter" "efs_id" {
  name  = "/silver/EFS_ID"
  type  = "String"
  value = aws_efs_file_system.cockroach.id
}

resource "aws_ssm_parameter" "ecr_backend" {
  name  = "/silver/ECR_BACKEND"
  type  = "String"
  value = aws_ecr_repository.backend.repository_url
}

resource "aws_ssm_parameter" "ecr_frontend" {
  name  = "/silver/ECR_FRONTEND"
  type  = "String"
  value = aws_ecr_repository.frontend.repository_url
}
