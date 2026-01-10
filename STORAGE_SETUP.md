# Storage Setup Guide

This guide explains how to set up Supabase storage for file uploads in the vendor app.

## Overview

The application uses Supabase Storage for handling file uploads (vendor documents like licenses, certifications, etc.). Files are uploaded through the backend API, which then stores them in Supabase storage buckets.

## Features

- ✅ Real-time upload progress tracking
- ✅ File size validation (5MB max)
- ✅ File type validation (PDF, JPEG, PNG)
- ✅ Secure uploads with JWT authentication
- ✅ Unique file naming to prevent collisions
- ✅ Public URL generation for stored files

## Setup Instructions

### 1. Create Supabase Project

If you don't have a Supabase project yet:

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Note down your project URL and API key

### 2. Create Storage Bucket

1. In your Supabase project dashboard, go to **Storage**
2. Click **New Bucket**
3. Set bucket name to: `vendor-documents`
4. Configure bucket settings:
   - **Public bucket**: ✅ Yes (to allow public URL access)
   - **File size limit**: 5242880 (5MB in bytes)
   - **Allowed MIME types**:
     - `application/pdf`
     - `image/jpeg`
     - `image/png`
     - `image/jpg`

### 3. Configure Bucket Policies

Set up Row Level Security (RLS) policies for the bucket:

#### Policy 1: Allow Authenticated Uploads

```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vendor-documents');
```

#### Policy 2: Allow Public Read Access

```sql
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vendor-documents');
```

#### Policy 3: Allow Authenticated Delete

```sql
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vendor-documents');
```

### 4. Environment Variables

Add the following to your backend `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

To find these values:

1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy the **Project URL** (SUPABASE_URL)
4. Copy the **anon public** key (SUPABASE_KEY)

### 5. Test the Setup

1. Start your backend server:

   ```bash
   cd backend
   yarn start:dev
   ```

2. Start the vendor app:

   ```bash
   cd apps/vendor-app
   npx expo start
   ```

3. Navigate to the vendor signup flow → Step 2 (Verify Documents)
4. Try uploading a document
5. You should see:
   - Upload progress bar
   - File successfully uploaded
   - File URL stored in the form

## File Upload Flow

```
User selects file
    ↓
Frontend (uploadFile service)
    ↓ [FormData + Progress Tracking]
Backend (/storage/upload endpoint)
    ↓ [File Validation]
Supabase Storage
    ↓ [Store in vendor-documents bucket]
Returns Public URL
    ↓
Frontend stores URL in form
```

## API Endpoints

### Upload File

```
POST /storage/upload
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

Body:
- file: File (max 5MB, PDF/JPEG/PNG only)

Response:
{
  "url": "https://your-project.supabase.co/storage/v1/object/public/vendor-documents/..."
}
```

### Delete File

```
DELETE /storage/delete
Authorization: Bearer {jwt_token}
Content-Type: application/json

Body:
{
  "url": "https://your-project.supabase.co/storage/v1/object/public/vendor-documents/..."
}

Response: 204 No Content
```

## File Validation Rules

### Size Limit

- Maximum file size: **5MB (5,242,880 bytes)**
- Files larger than this will be rejected with a 400 error

### Allowed File Types

- PDF: `application/pdf`
- JPEG: `image/jpeg`, `image/jpg`
- PNG: `image/png`

### File Naming

Files are automatically renamed to prevent collisions:

```
{timestamp}-{original-filename}
Example: 1704067200000-business-license.pdf
```

## Troubleshooting

### Upload fails with 401 Unauthorized

- Ensure the JWT token is valid and not expired
- Check that the Authorization header is being sent

### Upload fails with 400 Bad Request

- Check file size (must be ≤ 5MB)
- Check file type (must be PDF, JPEG, or PNG)
- Ensure file is being sent in FormData with key 'file'

### Upload fails with 500 Internal Server Error

- Verify SUPABASE_URL and SUPABASE_KEY are correct in .env
- Check that the 'vendor-documents' bucket exists in Supabase
- Verify bucket policies allow authenticated uploads

### File uploads but URL is not accessible

- Ensure the bucket is set to **Public**
- Check that the "Allow public read access" policy is active

### Progress bar not showing

- Ensure you're using XMLHttpRequest (not fetch)
- Check that onProgress callback is being passed to uploadFile

## Security Considerations

1. **Authentication Required**: All uploads require a valid JWT token
2. **File Validation**: Backend validates file size and type before uploading
3. **Unique Naming**: Files are renamed with timestamps to prevent overwriting
4. **Public URLs**: Files are publicly accessible once uploaded (suitable for documents that need to be shared)
5. **Rate Limiting**: Consider adding rate limiting to prevent abuse

## Future Enhancements

- [ ] Image optimization/compression before upload
- [ ] Support for additional file types
- [ ] File scanning for malware
- [ ] CDN integration for faster delivery
- [ ] Automatic cleanup of orphaned files
- [ ] File versioning support

## Support

If you encounter any issues, check:

1. Backend logs for detailed error messages
2. Supabase dashboard → Storage → Logs
3. Browser network tab for request/response details
