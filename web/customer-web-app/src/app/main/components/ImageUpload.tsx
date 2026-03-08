"use client";
import React, { useState } from "react";
import { Upload, Loader2, X } from "lucide-react";
import Image from "next/image";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";

interface ImageUploadProps {
  onUpload: (url: string) => void;
  value?: string;
  label?: string;
  bucket?: string;
  /**
   * When true, the component does NOT upload on file select.
   * Instead it shows a local blob preview and calls onFileSelect(file).
   * The parent is responsible for uploading when it's ready (e.g. on form submit).
   * Clicking X on a blob preview just clears the UI — no DELETE request is made.
   */
  deferred?: boolean;
  onFileSelect?: (file: File | null) => void;
}

export default function ImageUpload({
  onUpload,
  value,
  label = "Upload Image",
  bucket,
  deferred = false,
  onFileSelect,
}: ImageUploadProps) {
  const { data: session } = useSession();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (deferred) {
      // Deferred mode: just show a local preview, don't upload yet.
      const blobUrl = URL.createObjectURL(file);
      setPreview(blobUrl);
      onFileSelect?.(file);
      // Pass the blob URL into the form field so schema validation sees a
      // non-empty value; the parent replaces it with the real URL on submit.
      onUpload(blobUrl);
      return;
    }

    // Immediate upload mode (original behaviour).
    try {
      setUploading(true);
      const token = (session as any)?.accessToken;
      if (!token) throw new Error("Authentication required to upload");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/storage/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setPreview(data.url);
      onUpload(data.url);
      toast.success("Image uploaded!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error uploading image");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    if (!preview) return;

    // Blob URL = file was chosen locally but never uploaded — just clear UI.
    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
      setPreview(null);
      onUpload("");
      onFileSelect?.(null);
      return;
    }

    // Remote URL = file lives on the server — delete it.
    try {
      const token = (session as any)?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/storage/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: preview }),
      });

      if (!response.ok) throw new Error("Delete failed");

      setPreview(null);
      onUpload("");
      onFileSelect?.(null);
      toast.info("Image removed");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Could not delete image file");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-400 uppercase ml-1">
        {label}
      </label>

      {preview ? (
        <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 group">
          <Image src={preview} alt="Preview" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              type="button"
              onClick={removeImage}
              className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-32">
          <label
            className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${uploading ? "opacity-50" : ""}`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-2" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
              )}
              <p className="text-xs text-gray-500 font-bold">
                {uploading ? "Uploading..." : "Click to upload"}
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>
      )}
    </div>
  );
}
