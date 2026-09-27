/**
 * Uploads a file to the backend's local media storage and returns the public URL.
 * The `token` parameter should be the JWT accessToken from the NextAuth session.
 *
 * @param file   The file object from an input element
 * @param folder The target folder ('event_covers', 'organizer_logos', etc.)
 * @param token  JWT Bearer token from session.accessToken
 */
export async function uploadToS3(file: File, folder: string = 'uploads', token?: string): Promise<string> {
  if (!token) {
    throw new Error('Authentication required for uploading.');
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await fetch(`${API_URL}/upload/local/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload file');
  }

  const data = await response.json();
  return data.file_url;
}
