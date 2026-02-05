"use client";

import React, { useState } from "react";
import { ImageIcon, Maximize2, Download, ExternalLink, X } from "lucide-react";

interface EvidenceGalleryProps {
  files: string[];
}

export const EvidenceGallery = ({ files }: EvidenceGalleryProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!files || files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-zinc-800 rounded-3xl text-zinc-500">
        <ImageIcon size={40} className="mb-4 opacity-20" />
        <p className="text-sm font-bold uppercase tracking-widest">
          No Evidence Provided
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
        Evidence Photos{" "}
        <span className="text-yellow-500">({files.length})</span>
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {files.map((url, index) => (
          <div
            key={index}
            className="group relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer"
            onClick={() => setSelectedImage(url)}
          >
            <img
              src={url}
              alt={`Evidence ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <Maximize2 className="text-white w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox / Full-Screen Preview */}
      {selectedImage && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={24} />
          </button>

          <div className="max-w-5xl w-full h-full flex flex-col items-center justify-center gap-6">
            <img
              src={selectedImage}
              alt="Evidence Full View"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />

            <div className="flex items-center gap-4">
              <a
                href={selectedImage}
                download
                target="_blank"
                className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-yellow-500 transition-colors"
              >
                <Download size={18} /> Download Original
              </a>
              <a
                href={selectedImage}
                target="_blank"
                className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors"
              >
                <ExternalLink size={18} /> Open in New Tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
