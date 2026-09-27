import os
import boto3
import uuid
from botocore.config import Config
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.conf import settings

class PresignedUrlView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        filename = request.data.get('filename')
        file_type = request.data.get('file_type')

        if not filename or not file_type:
            return Response({'error': 'filename and file_type are required'}, status=status.HTTP_400_BAD_REQUEST)

        bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', '')
        region = getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
        
        if not bucket_name:
            return Response({'error': 'AWS_STORAGE_BUCKET_NAME is not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Generate a unique key for the file
        ext = filename.split('.')[-1] if '.' in filename else ''
        unique_filename = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
        
        # Determine a prefix based on the user's role or request data if needed, defaulting to uploads
        # E.g. event_covers/ or organizer_logos/
        folder = request.data.get('folder', 'uploads')
        if folder not in ['event_covers', 'organizer_logos']:
            folder = 'uploads'
            
        object_key = f"{folder}/{unique_filename}"

        s3_client = boto3.client(
            's3',
            aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', ''),
            aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', ''),
            region_name=region,
            config=Config(signature_version='s3v4')
        )

        try:
            # Generate the presigned URL for PUT requests
            upload_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': bucket_name,
                    'Key': object_key,
                    'ContentType': file_type
                },
                ExpiresIn=3600 # 1 hour
            )
            
            # Construct the final public URL to be saved in DB
            cloudfront_domain = getattr(settings, 'AWS_CLOUDFRONT_DOMAIN', '')
            if cloudfront_domain:
                # Remove trailing slash if present in settings
                cloudfront_domain = cloudfront_domain.rstrip('/')
                # Check if scheme is included
                if not cloudfront_domain.startswith('http'):
                    cloudfront_domain = f"https://{cloudfront_domain}"
                file_url = f"{cloudfront_domain}/{object_key}"
            else:
                file_url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{object_key}"

            return Response({
                'upload_url': upload_url,
                'file_url': file_url,
                'object_key': object_key
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
