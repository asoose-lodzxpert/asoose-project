"use client";
import React from "react";
import { Calendar } from "lucide-react";
import { DisputeDetail } from "../types";
interface Props {
  dispute: DisputeDetail;
}

export default function DisputeTimeline({ dispute }: Props) {
  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-xl">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" /> Timeline
      </h2>
      <div className="space-y-4 relative border-l border-gray-700 ml-2 pl-6">
        {/* Created Event */}
        <div className="relative">
          <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full border-2 border-[#1E293B] bg-blue-500"></div>
          <p className="text-xs font-bold text-gray-300">Opened</p>
          <p className="text-[10px] text-gray-500 font-mono">
            {new Date(dispute.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Resolved Event */}
        {dispute.resolvedAt && (
          <div className="relative">
            <div
              className={`absolute -left-[29px] top-1 w-3 h-3 rounded-full border-2 border-[#1E293B] ${
                dispute.status === "RESOLVED" ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <p className="text-xs font-bold text-gray-300">
              {dispute.status === "RESOLVED" ? "Resolved" : "Rejected"}
            </p>
            <p className="text-[10px] text-gray-500 font-mono">
              {new Date(dispute.resolvedAt).toLocaleString()}
            </p>
            {dispute.refundAmount && dispute.refundAmount > 0 && (
              <span className="inline-block mt-1 text-[10px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded border border-green-800">
                Refunded ${dispute.refundAmount}
              </span>
            )}
            {dispute.resolution && (
              <p className="text-[10px] text-gray-400 mt-1 italic line-clamp-2">
                "{dispute.resolution}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
