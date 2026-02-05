"use client";
import React from "react";
import Link from "next/link";
import { ArrowLeft, Copy, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";

interface Props {
  id: string;
  status: string;
  breachedSLA: boolean;
  hoursOpen: number;
}

export default function DisputeHeader({
  id,
  status,
  breachedSLA,
  hoursOpen,
}: Props) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(id);
    toast.success("Dispute ID copied");
  };

  return (
    <div className="space-y-4">
      {/* Navigation & Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link
            href="/super-admin/disputes"
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-2 text-sm transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Disputes
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Dispute #{id.substring(0, 8)}
            </h1>
            <button
              onClick={copyToClipboard}
              className="text-gray-500 hover:text-white transition-colors"
              title="Copy ID"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SLA Alert */}
      {breachedSLA && status === "OPEN" && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 font-bold text-sm">SLA Breach Alert</p>
            <p className="text-red-300 text-xs">
              Opened {hoursOpen}h ago. Immediate action required.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
