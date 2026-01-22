import { getSession } from "next-auth/react";

export async function uploadBannerImage(file: File) {
  // 1. Get Session for Token
  const session = await getSession();
  const token = (session as any)?.accessToken;
  
  if (!token) {
    throw new Error("Authentication required to upload banner");
  }

  // 2. Prepare Form Data
  const formData = new FormData();
  formData.append('file', file);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  // 3. Upload to Backend
  const res = await fetch(`${API_URL}/storage/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    throw new Error('Banner upload failed');
  }

  const data = await res.json();
  return data.url; // Expecting { url: "..." } from backend
}