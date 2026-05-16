resource "aws_security_group" "node" {
  name        = "${var.cluster_name}-node-sg"
  description = "EKS managed node group security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Allow all intra-node traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  ingress {
    description = "Allow ALB to reach pods"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.cluster_name}-node-sg" }
}

resource "aws_security_group" "efs" {
  name   = "${var.cluster_name}-efs-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    description     = "NFS from nodes"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_eks_cluster.main.vpc_config[0].cluster_security_group_id]
  }

  tags = { Name = "${var.cluster_name}-efs-sg" }
}
