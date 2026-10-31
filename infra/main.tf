terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = "ap-southeast-2"
}

resource "aws_security_group" "k8s" {
  name        = "attendance-k8s-sg"
  description = "SSH and HTTP for the attendance server"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "k8s" {
  ami                    = "ami-0dd60a46ecc6eac16"
  instance_type          = "t3.small"
  key_name               = "attendance-key"
  vpc_security_group_ids = [aws_security_group.k8s.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  user_data = <<-EOT
    #!/bin/bash
    curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
  EOT

  tags = {
    Name = "attendance-k8s"
  }
}

resource "aws_eip" "k8s" {
  instance = aws_instance.k8s.id
  domain   = "vpc"
}

output "public_ip" {
  value = aws_eip.k8s.public_ip
}
