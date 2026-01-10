import AsyncStorage from "@react-native-async-storage/async-storage";

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

  // Get auth token
  const token = await AsyncStorage.getItem("token");

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
    xhr.open("POST", `${process.env.EXPO_PUBLIC_API_URL}/storage/upload`);

    // Set authorization header
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    // Note: Don't set Content-Type header - it will be set automatically with boundary
    xhr.send(formData);
  });
}

export async function deleteFile(url: string): Promise<void> {
  const token = await AsyncStorage.getItem("token");

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/storage/delete`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ url }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete file");
  }
}
