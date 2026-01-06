'use client';

import React, { useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import { Upload, Loader2, X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-toastify';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  value?: string;
  label?: string;
}

export default function ImageUpload({ onUpload, value, label = "Upload Image" }: ImageUploadProps) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = e.target.files[0];
      // Create a unique file path: timestamp-random-filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `vendor-images/${fileName}`;

      // 1. Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from('uploads') // Make sure this matches your bucket name
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      // 3. Return URL to parent
      setPreview(data.publicUrl);
      onUpload(data.publicUrl);
      toast.success("Image uploaded!");

    } catch (error: any) {
      toast.error(error.message || "Error uploading image");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // ... inside ImageUpload component

  const removeImage = async () => {
    try {
      if (!preview) return;

      // 1. Extract the file path from the full URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[folder]/[file.png]
      // We need just: [folder]/[file.png]
      
      const path = preview.split('/uploads/')[1]; // 'uploads' is your bucket name
      
      if (path) {
        const { error } = await supabase.storage
          .from('uploads')
          .remove([path]); // It expects an array of paths

        if (error) throw error;
      }

      // 2. Clear state
      setPreview(null);
      onUpload(''); // Notify parent the image is gone
      toast.info("Image removed");

    } catch (error: any) {
      console.error("Error deleting image:", error);
      toast.error("Could not delete image file");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-400 uppercase ml-1">{label}</label>
      
      {preview ? (
        <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 dark:border-white/10 group">
          <Image 
            src={preview} 
            alt="Upload preview" 
            fill 
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             <button 
               type="button"
               onClick={removeImage}
               className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
             >
               <X className="w-5 h-5" />
             </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-32">
          <label className={`
             flex flex-col items-center justify-center w-full h-full 
             border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl 
             cursor-pointer bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/5 
             transition-colors
             ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}>
             <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {uploading ? (
                   <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-2" />
                ) : (
                   <Upload className="w-8 h-8 text-gray-400 mb-2" />
                )}
                <p className="text-xs text-gray-500 font-bold">{uploading ? 'Uploading...' : 'Click to upload'}</p>
                <p className="text-[10px] text-gray-400 mt-1">PNG, JPG up to 2MB</p>
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