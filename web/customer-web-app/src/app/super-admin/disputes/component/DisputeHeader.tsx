"use client";
import React from "react";
import { Download } from "lucide-react";

interface Props {
  total: number;
  onExport: () => void;
}

export default function DisputeHeader({ total, onExport }: Props) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Dispute Resolution
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {total} total records found
        </p>
      </div>
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-bold border border-gray-700"
      >
        <Download className="w-4 h-4" /> Export CSV
      </button>
    </div>
  );
}
