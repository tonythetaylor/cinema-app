output "public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.cinema_server.public_ip
}

output "public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.cinema_server.public_dns
}

output "bucket_name" {
  description = "Name of the S3 bucket for movies"
  value       = aws_s3_bucket.movies.bucket
}

output "bucket_url" {
  description = "URL to serve objects from"
  value       = "https://${aws_s3_bucket.movies.bucket}.s3.amazonaws.com"
}