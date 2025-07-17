# infra/s3.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# generate a short random suffix so bucket names don’t collide
resource "random_id" "suffix" {
  byte_length = 4
}

# the bucket itself: private by default, with CORS for your frontend
resource "aws_s3_bucket" "movies" {
  bucket = "cinema-app-movies-${random_id.suffix.hex}"

  tags = {
    Name = "cinema-app-movies"
    Env  = "dev"
  }

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = [
      "http://localhost:3000",
      "https://app.local",
    ]
    max_age_seconds = 3000
  }
}

# enable versioning (preferred as its own resource)
resource "aws_s3_bucket_versioning" "movies" {
  bucket = aws_s3_bucket.movies.id

  versioning_configuration {
    status = "Enabled"
  }
}

# enforce server-side encryption by default
resource "aws_s3_bucket_server_side_encryption_configuration" "movies" {
  bucket = aws_s3_bucket.movies.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# allow attaching a public policy
resource "aws_s3_bucket_public_access_block" "movies" {
  bucket = aws_s3_bucket.movies.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false
  restrict_public_buckets = false
}

# world-readable GETs to all objects under /
resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.movies.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowPublicRead"
        Effect    = "Allow"
        Principal = "*"
        Action    = ["s3:GetObject"]
        Resource  = "${aws_s3_bucket.movies.arn}/*"
      }
    ]
  })
}

# exposed outputs for use in your frontend config
output "bucket_name" {
  value = aws_s3_bucket.movies.bucket
}

output "bucket_url" {
  value = "https://${aws_s3_bucket.movies.bucket}.s3.amazonaws.com"
}