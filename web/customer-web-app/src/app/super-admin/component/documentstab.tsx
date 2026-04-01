"use client";

import React, { useState } from "react";
import {
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  AlertTriangle,
  Clock,
} from "lucide-react";
import Swal from "sweetalert2";
import Image from "next/image";
import { formatDateTime } from "@/utils/formatDate";

// Unified Interface matching your Prisma Schema
export interface Document {
  id: string;
  type: string; // e.g. "DRIVER_LICENSE" or "CAC_CERT"
  url: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason?: string;
  createdAt: string; // or updatedAt
}

interface DocumentsTabProps {
  documents: Document[];
  onVerify: (docId: string) => void;
  onReject: (docId: string, reason: string) => void;
  showUploadButton?: boolean; // Optional: Only show for Vendors if needed
}

export default function DocumentsTab({
  documents,
  onVerify,
  onReject,
  showUploadButton = false,
}: DocumentsTabProps) {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const handleRejectClick = async (doc: Document) => {
    const { value: reason } = await Swal.fire({
      title: "Reject Document?",
      text: `Why is this ${doc.type.replace(/_/g, " ").toLowerCase()} invalid?`,
      input: "textarea",
      inputPlaceholder: "Reason (e.g. Blurry image, Expired)",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Reject",
      background: "#1E293B",
      color: "#fff",
      inputValidator: (val) => !val && "You need to write a reason!",
    });

    if (reason) onReject(doc.id, reason);
  };

  // Helper for status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "REJECTED":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Optional Header (mostly for Vendors) */}
      {showUploadButton && (
        <div className="flex justify-end">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-2 text-sm transition-all">
            <Upload className="w-4 h-4" /> Upload New Document
          </button>
        </div>
      )}

      {!documents || documents.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl bg-gray-900/50">
          <FileText className="w-12 h-12 mb-3 text-gray-600" />
          <p className="text-gray-500">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 flex flex-col gap-4 group hover:border-gray-700 transition-all shadow-lg shadow-black/20"
            >
              {/* Header: Icon + Name + Status */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center border border-gray-700 text-gray-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm capitalize">
                      {doc.type.replace(/_/g, " ")}
                    </h4>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{" "}
                      {formatDateTime(doc.createdAt)}
                    </span>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusStyle(doc.status)}`}
                >
                  {doc.status}
                </span>
              </div>

              {/* Image Preview (Click to Open Lightbox) */}
              <div
                onClick={() => setSelectedDoc(doc)}
                className="relative h-40 w-full bg-gray-900 rounded-lg border border-gray-800 overflow-hidden cursor-pointer group/image"
              >
                {/* Fallback to standard img if remote patterns aren't set up in next.config.js */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.url}
                  alt={doc.type}
                  className="w-full h-full object-cover opacity-60 group-hover/image:opacity-100 transition-all duration-300"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 bg-black/40 backdrop-blur-[2px] transition-all">
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-xs font-bold border border-white/20">
                    <Eye className="w-3 h-3" /> View
                  </button>
                </div>
              </div>

              {/* Rejection Reason Box */}
              {doc.status === "REJECTED" && doc.rejectionReason && (
                <div className="bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg text-xs text-red-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>
                    <span className="font-bold text-red-400">Reason:</span>{" "}
                    {doc.rejectionReason}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-auto pt-2 border-t border-gray-800/50">
                <button
                  className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>

                {doc.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => onVerify(doc.id)}
                      className="flex-1 py-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white border border-green-500/20 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => handleRejectClick(doc)}
                      className="flex-1 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- Lightbox Modal --- */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            onClick={() => setSelectedDoc(null)}
            className="absolute top-5 right-5 text-white/50 hover:text-white bg-white/10 p-2 rounded-full transition-colors"
          >
            <XCircle className="w-8 h-8" />
          </button>

          <div className="max-w-3xl w-full max-h-[85vh] flex flex-col gap-4">
            <div className="flex items-center justify-between text-white">
              <h3 className="text-xl font-bold capitalize">
                {selectedDoc.type.replace(/_/g, " ")}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${getStatusStyle(selectedDoc.status)}`}
              >
                {selectedDoc.status}
              </span>
            </div>

            <div className="relative w-full h-[65vh] bg-black rounded-xl border border-gray-800 overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedDoc.url}
                alt="Doc"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {selectedDoc.status === "PENDING" && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    handleRejectClick(selectedDoc);
                    setSelectedDoc(null);
                  }}
                  className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-500/20"
                >
                  Reject Document
                </button>
                <button
                  onClick={() => {
                    onVerify(selectedDoc.id);
                    setSelectedDoc(null);
                  }}
                  className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg shadow-green-500/20"
                >
                  Approve Document
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
