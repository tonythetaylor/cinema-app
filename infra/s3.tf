resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "movies" {
  bucket = "cinema-app-movies-${random_id.suffix.hex}"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = [
      "http://localhost:3000",
      "https://app.local",
    ]
    max_age_seconds = 3000
  }

  tags = {
    Name = "cinema-app-movies"
    Env  = "dev"
  }
}

resource "aws_s3_bucket_versioning" "movies" {
  bucket = aws_s3_bucket.movies.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "movies" {
  bucket = aws_s3_bucket.movies.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "movies" {
  bucket = aws_s3_bucket.movies.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.movies.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowPublicRead"
      Effect    = "Allow"
      Principal = "*"
      Action    = ["s3:GetObject"]
      Resource  = "${aws_s3_bucket.movies.arn}/*"
    }]
  })
}