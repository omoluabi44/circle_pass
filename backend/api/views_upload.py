import os
import uuid
import boto3
from botocore.config import Config
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

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


class LocalFileUploadView(APIView):
    """
    Simple local file upload endpoint. Saves the file to Django's MEDIA_ROOT
    and returns an absolute URL. Used when AWS S3 is not configured.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        folder = request.data.get('folder', 'uploads')
        if folder not in ['event_covers', 'organizer_logos', 'uploads']:
            folder = 'uploads'

        ext = os.path.splitext(file_obj.name)[1]
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = f"{folder}/{unique_filename}"

        # Save to MEDIA_ROOT using Django's default_storage
        saved_path = default_storage.save(file_path, ContentFile(file_obj.read()))

        # Build an absolute URL
        file_url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)

        return Response({'file_url': file_url})
