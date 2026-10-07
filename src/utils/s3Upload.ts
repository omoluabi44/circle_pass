import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function uploadToS3(file: File, folder: string = 'uploads', token?: string): Promise<string> {
  const authToken = token || Cookies.get('accessToken');
  if (!authToken) {
    throw new Error('Authentication required for uploading.');
  }

  let response;
  try {
    // 1. Get Presigned URL from Backend
    response = await fetch(`${API_URL}/upload/presigned-url/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        filename: file.name,
        file_type: file.type,
        folder: folder
      })
    });
  } catch (err: any) {
    console.error("Presigned URL fetch failed:", err);
    throw new Error("Could not reach the server to start the upload. Please check your internet connection or disable adblockers.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get secure upload link from server.');
  }

  const data = await response.json();
  const uploadUrl = data.upload_url;
  const fileUrl = data.file_url;

  let uploadResponse;
  try {
    // 2. Upload file directly to S3 via Presigned URL
    uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type
      },
      body: file
    });
  } catch (err: any) {
    console.error("S3 Direct Upload failed:", err);
    throw new Error("Upload blocked by network/browser. If you are using an adblocker or strict privacy shield (like Brave), please temporarily disable it. Also ensure your device clock is correct.");
  }

  if (!uploadResponse.ok) {
    // If we get here, S3 rejected it but DID send CORS headers, so we can actually see the status code.
    throw new Error(`AWS S3 rejected the upload (Status: ${uploadResponse.status}). The file might be too large or unsupported.`);
  }

  // 3. Return the final public CDN/S3 URL
  return fileUrl;
}
