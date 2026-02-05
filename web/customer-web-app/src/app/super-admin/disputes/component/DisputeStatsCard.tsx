"use client";
import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { DisputeStats } from "../types";
interface Props {
  stats: DisputeStats | null;
}

export default function DisputeStatsCard({ stats }: Props) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* 1. Action Required (Grouped Critical Stats) */}
      <div className="lg:col-span-2 bg-red-900/10 border border-red-500/20 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
              Requires Action
            </p>
            <p className="text-3xl font-bold text-white">{stats.totalOpen}</p>
            <p className="text-gray-500 text-xs">Total Open Disputes</p>
          </div>
          <AlertCircle className="w-8 h-8 text-red-500/20" />
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-red-500/10 pt-4">
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Urgent Priority</p>
            <p className="text-white font-bold text-lg">{stats.urgentOpen}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">SLA Breached</p>
            <p className="text-red-400 font-bold text-lg flex items-center gap-2">
              {stats.breachedSLA}{" "}
              <AlertTriangle className="w-3 h-3 animate-pulse" />
            </p>
          </div>
        </div>
      </div>

      {/* 2. Performance (Resolved) */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-gray-300 font-bold text-sm">Resolved</p>
        </div>
        <p className="text-2xl font-bold text-white mb-2">
          {stats.totalResolved}
        </p>
        <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-green-500 h-full"
            style={{ width: `${stats.resolutionRate}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {stats.resolutionRate.toFixed(0)}% Resolution Rate
        </p>
      </div>

      {/* 3. Rejected */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gray-700/50 rounded-lg">
            <XCircle className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-gray-300 font-bold text-sm">Rejected</p>
        </div>
        <p className="text-2xl font-bold text-white">{stats.totalRejected}</p>
        <p className="text-xs text-gray-500 mt-1">Dismissed claims</p>
      </div>
    </div>
  );
}
