'use client';
import React, { useState } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { useSession } from "next-auth/react";

interface ImageUploadProps {
  onUpload: (url: string) => void;
  value?: string;
  label?: string;
  bucket?: string; // Kept for prop compatibility, though now handled by backend
}

export default function ImageUpload({ onUpload, value, label = "Upload Image", bucket }: ImageUploadProps) {
  const { data: session } = useSession();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      
      const token = (session as any)?.accessToken;
      if (!token) {
        throw new Error("Authentication required to upload");
      }

      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);

      // Use the backend upload endpoint
      const response = await fetch(`${API_URL}/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      // Backend returns { url: string }
      
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
    try {
      if (!preview) return;
      
      const token = (session as any)?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/storage/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: preview })
      });

      if (!response.ok) throw new Error("Delete failed");

      setPreview(null);
      onUpload('');
      toast.info("Image removed");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Could not delete image file");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-400 uppercase ml-1">{label}</label>
      
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
          <label className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${uploading ? 'opacity-50' : ''}`}>
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-2" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
              )}
              <p className="text-xs text-gray-500 font-bold">
                {uploading ? 'Uploading...' : 'Click to upload'}
              </p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleUpload} 
              disabled={uploading} 
            />
          </label>
        </div>
      )}
    </div>
  );
}