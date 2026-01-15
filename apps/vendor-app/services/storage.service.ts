import { getAccessToken } from "./auth";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export async function uploadFile(
  file: { uri: string; name: string; type: string },
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const formData = new FormData();

  // @ts-ignore - React Native FormData supports file objects
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  });

  // Get auth token (optional for signup)
  const token = await getAccessToken();

  // Use public endpoint if no token (during signup), authenticated endpoint otherwise
  const endpoint = token ? "/storage/upload" : "/storage/upload-public";

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        };
        onProgress(progress);
      }
    });

    // Handle completion
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.url);
        } catch (error) {
          reject(new Error("Failed to parse upload response"));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || "Upload failed"));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    // Handle errors
    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload cancelled"));
    });

    // Configure and send request
    xhr.open("POST", `${process.env.EXPO_PUBLIC_API_URL}${endpoint}`);

    // Set authorization header only if token exists
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    // Note: Don't set Content-Type header - it will be set automatically with boundary
    xhr.send(formData);
  });
}

export async function deleteFile(url: string): Promise<void> {
  const token = await getAccessToken();

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/storage/delete`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ url }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete file");
  }
}

export interface BulkUploadResult {
  urls: string[];
  totalFiles: number;
  uploadedFiles: number;
  errors?: { index: number; message: string }[];
}

export async function uploadBulk(
  files: { uri: string; name: string; type: string }[],
  onProgress?: (progress: UploadProgress) => void
): Promise<string[]> {
  const formData = new FormData();

  console.log("uploadBulk called with files:", files.length);

  // Append all files
  files.forEach((file, index) => {
    // @ts-ignore - React Native FormData supports file objects
    formData.append("files", {
      uri: file.uri,
      name: file.name || `image-${index}.jpg`,
      type: file.type || "image/jpeg",
    });
  });

  // Get auth token
  const token = await getAccessToken();

  if (!token) {
    console.error("No auth token found");
    throw new Error("Authentication required for bulk upload");
  }

  console.log(
    "Uploading to:",
    `${process.env.EXPO_PUBLIC_API_URL}/storage/upload-bulk`
  );

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        };
        onProgress(progress);
      }
    });

    // Handle completion
    xhr.addEventListener("load", () => {
      console.log("Upload completed with status:", xhr.status);
      console.log("Response:", xhr.responseText);

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response: BulkUploadResult = JSON.parse(xhr.responseText);

          // Log any errors but still return successful uploads
          if (response.errors && response.errors.length > 0) {
            console.warn("Some files failed to upload:", response.errors);
          }

          resolve(response.urls);
        } catch (error) {
          console.error("Failed to parse response:", error);
          reject(new Error("Failed to parse upload response"));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          console.error("Upload failed:", error);
          reject(new Error(error.message || "Bulk upload failed"));
        } catch {
          console.error("Upload failed with status:", xhr.status);
          reject(new Error(`Bulk upload failed with status ${xhr.status}`));
        }
      }
    });

    // Handle errors
    xhr.addEventListener("error", (e) => {
      console.error("Network error during upload:", e);
      reject(new Error("Network error during bulk upload"));
    });

    xhr.addEventListener("abort", () => {
      console.error("Upload cancelled");
      reject(new Error("Bulk upload cancelled"));
    });

    // Configure and send request
    xhr.open("POST", `${process.env.EXPO_PUBLIC_API_URL}/storage/upload-bulk`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    // Note: Don't set Content-Type header - it will be set automatically with boundary
    xhr.send(formData);
  });
}
