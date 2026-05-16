terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    http = {
      source  = "hashicorp/http"
      version = "~> 3.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Uncomment after creating the S3 bucket + DynamoDB table for remote state:
  # backend "s3" {
  #   bucket         = "silver-terraform-state"
  #   key            = "silver/terraform.tfstate"
  #   region         = "ap-southeast-1"
  #   dynamodb_table = "silver-terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${var.cluster_name}/cluster"
  retention_in_days = 7
}
