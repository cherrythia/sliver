resource "aws_efs_file_system" "cockroach" {
  creation_token   = "${var.cluster_name}-cockroach"
  encrypted        = true
  performance_mode = "generalPurpose"
  tags             = { Name = "${var.cluster_name}-cockroach-efs" }
}

resource "aws_efs_mount_target" "cockroach" {
  count           = 2
  file_system_id  = aws_efs_file_system.cockroach.id
  subnet_id       = aws_subnet.public[count.index].id
  security_groups = [aws_security_group.efs.id]
}
