"use client";

import React, { useRef } from "react";
import { SignupStep2Data } from "@/types/vendor-signup";
import { Upload, X, FileCheck, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

interface Step2Props {
  data: SignupStep2Data;
  onChange: (keyOrObj: keyof SignupStep2Data | Partial<SignupStep2Data>, val?: any) => void;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function Step2({ data, onChange }: Step2Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof SignupStep2Data, nameKey: keyof SignupStep2Data, fileKey: keyof SignupStep2Data) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        [key]: reader.result as string,
        [nameKey]: file.name,
        [fileKey]: file
      });
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (key: keyof SignupStep2Data, nameKey: keyof SignupStep2Data, fileKey: keyof SignupStep2Data) => {
    onChange({
        [key]: "",
        [nameKey]: "",
        [fileKey]: undefined
    });
  };

  const DocUpload = ({ label, uri, name, onUpload, onRemove }: any) => (
    <div className="p-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl transition-all hover:border-yellow-500/50 group">
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{label} <span className="text-red-500">*</span></label>
        {uri && <CheckCircle2 className="text-green-500" size={20} />}
      </div>

      <div className="relative">
        {uri ? (
          <div className="flex flex-col gap-4">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/40">
               {uri.startsWith("data:image") || uri.includes("image") ? (
                 <img src={uri} alt="preview" className="w-full h-full object-cover" />
               ) : (
                 <div className="flex flex-col items-center justify-center h-full gap-2">
                    <FileCheck className="text-yellow-500" size={32} />
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Document Selected</span>
                 </div>
               )}
               <button 
                  onClick={onRemove}
                  className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-all z-10 animate-in zoom-in duration-200"
                >
                  <Trash2 size={16} />
               </button>
            </div>
            <div className="flex items-center gap-3 px-1">
               <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{name}</p>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-0.5">Ready for verification</p>
               </div>
            </div>
          </div>
        ) : (
          <div 
            onClick={onUpload}
            className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl hover:border-yellow-500/40 hover:bg-yellow-500/5 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload size={24} className="text-gray-400 group-hover:text-yellow-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">Click to upload document</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">PNG, JPG or PDF (Max 5MB)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-black tracking-tight">Document Verification</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">We need these to verify your business identity</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <DocUpload 
          label="Business Registration Certificate"
          uri={data.businessRegCertUri}
          name={data.businessRegCertName}
          onUpload={() => fileInputRef.current?.click()}
          onRemove={() => removeFile("businessRegCertUri", "businessRegCertName", "businessRegCertFile")}
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => handleFileChange(e, "businessRegCertUri", "businessRegCertName", "businessRegCertFile")}
          accept="image/*,.pdf"
        />

        <DocUpload 
          label="Tax Identification Document"
          uri={data.taxIdDocUri}
          name={data.taxIdDocName}
          onUpload={() => {
            const el = document.createElement("input");
            el.type = "file";
            el.accept = "image/*,.pdf";
            el.onchange = (e: any) => handleFileChange(e, "taxIdDocUri", "taxIdDocName", "taxIdDocFile");
            el.click();
          }}
          onRemove={() => removeFile("taxIdDocUri", "taxIdDocName", "taxIdDocFile")}
        />

        <DocUpload 
          label="Proof of Address"
          uri={data.proofOfAddressUri}
          name={data.proofOfAddressName}
          onUpload={() => {
            const el = document.createElement("input");
            el.type = "file";
            el.accept = "image/*,.pdf";
            el.onchange = (e: any) => handleFileChange(e, "proofOfAddressUri", "proofOfAddressName", "proofOfAddressFile");
            el.click();
          }}
          onRemove={() => removeFile("proofOfAddressUri", "proofOfAddressName", "proofOfAddressFile")}
        />
      </div>

      <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
         <AlertCircle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
         <p className="text-xs text-yellow-700 dark:text-yellow-400 leading-relaxed font-medium">
           Ensure all documents are clear and legible. Blurred or cut-off documents will be rejected and delay your application process.
         </p>
      </div>
    </div>
  );
}
