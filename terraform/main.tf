provider "aws" {
  region = "us-east-1"
}

# ------------------------------------------------------------
# Security Groups
# ------------------------------------------------------------
resource "aws_security_group" "allow_web" {
  name        = "circlepass_allow_web"
  description = "Allow web and SSH inbound traffic"

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

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
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

resource "aws_security_group" "allow_rds" {
  name        = "circlepass_allow_rds"
  description = "Allow MySQL traffic from web server"

  ingress {
    description     = "MySQL from web server"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.allow_web.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ------------------------------------------------------------
# RDS Database (MySQL) - per strict project rules
# ------------------------------------------------------------
resource "aws_db_instance" "circlepass_db" {
  identifier           = "circlepass-db"
  allocated_storage    = 20
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.micro"
  db_name              = "circlepass"
  username             = "circlepass_admin"
  password             = "ChangeMe123!Secure" # Should be injected via TF_VAR or secrets in prod
  parameter_group_name = "default.mysql8.0"
  skip_final_snapshot  = true
  publicly_accessible  = false
  vpc_security_group_ids = [aws_security_group.allow_rds.id]
}

# ------------------------------------------------------------
# EC2 Instance
# ------------------------------------------------------------
resource "aws_instance" "web_server" {
  ami                    = "ami-0c7217cdde317cfec" # Ubuntu Server 22.04 LTS (us-east-1)
  instance_type          = "t3.large"
  vpc_security_group_ids = [aws_security_group.allow_web.id]
  key_name               = "coursepass-new" # Using the key pair from coursepass mobile project
  
  root_block_device {
    volume_size = 40
    volume_type = "gp3"
  }

  user_data = <<-EOF
  #!/bin/bash
  # Install Docker, Nginx, and utilities
  apt-get update -y
  apt-get install -y docker.io nginx curl

  # Start and enable services
  systemctl start docker nginx
  systemctl enable docker nginx

  # Give the ubuntu user permission to use Docker without sudo
  usermod -aG docker ubuntu

  # Install Docker Compose Version 2 directly
  curl -SL "https://github.com/docker/compose/releases/download/v2.26.1/docker-compose-linux-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose

  # Write the Nginx config from our local file to the server
  cat <<'INNER_EOF' > /etc/nginx/sites-available/default
  $${file("$${path.module}/nginx.conf")}
  INNER_EOF

  # Reload Nginx to apply changes
  systemctl reload nginx
  EOF

  tags = {
    Name = "CirclePass-Server"
  }
}

resource "aws_eip" "web_eip" {
  instance = aws_instance.web_server.id
  domain   = "vpc"
}

output "web_public_ip" {
  value = aws_eip.web_eip.public_ip
}
output "rds_endpoint" {
  value = aws_db_instance.circlepass_db.endpoint
}

# ------------------------------------------------------------
# S3 Bucket for Media/Static files
# ------------------------------------------------------------
resource "aws_s3_bucket" "circlepass_files" {
  bucket = "circlepass-files"

  tags = {
    Name        = "CirclePass Files"
    Environment = "production"
  }
}

resource "aws_s3_bucket_cors_configuration" "circlepass_files_cors" {
  bucket = aws_s3_bucket.circlepass_files.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD", "DELETE"]
    allowed_origins = [
      "https://circlepass.app",
      "https://www.circlepass.app",
      "http://localhost:3000",
      "https://localhost:3000",
      "*"
    ]
    expose_headers  = ["ETag", "x-amz-server-side-encryption", "x-amz-request-id", "x-amz-id-2"]
    max_age_seconds = 3600
  }
}

output "s3_bucket_name" {
  value = aws_s3_bucket.circlepass_files.id
}

