import boto3
import os
import uuid
from fastapi import UploadFile

AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
AWS_REGION = os.getenv("AWS_REGION")

def get_s3_client():
    return boto3.client("s3", region_name=AWS_REGION)

def upload_avatar_to_s3(user_id: int, file: UploadFile) -> str:
    s3 = get_s3_client()

    file_ext = file.filename.split(".")[-1]
    s3_key = f"avatars/{user_id}_{uuid.uuid4()}.{file_ext}"

    s3.upload_fileobj(file.file, AWS_S3_BUCKET, s3_key, ExtraArgs={"ACL": "public-read"})

    # Optionally use signed URL
    return s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": AWS_S3_BUCKET, "Key": s3_key},
        ExpiresIn=3600 * 24 * 7  # 7 days
    )