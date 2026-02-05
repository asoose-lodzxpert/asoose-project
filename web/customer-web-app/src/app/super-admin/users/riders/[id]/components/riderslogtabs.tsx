import React from "react";
import { Clock, ShieldAlert, CheckCircle, Info, User } from "lucide-react";

interface Log {
  id: string;
  action: string;
  metadata?: any;
  createdAt: string;
}

export const RiderLogsTab = ({ logs }: { logs: Log[] }) => {
  if (!logs || logs.length === 0) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center text-gray-500">
        <Clock className="w-10 h-10 mb-3 opacity-20" />
        <p>No activity logs found for this rider.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800">
      {logs.map((log) => (
        <div
          key={log.id}
          className="p-4 flex gap-4 hover:bg-[#0F172A]/50 transition-colors"
        >
          <div
            className={`mt-1 min-w-[32px] h-8 rounded-full flex items-center justify-center border ${
              log.action.includes("SUSPEND")
                ? "bg-red-500/10 text-red-500 border-red-500/20"
                : log.action.includes("VERIF")
                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                  : "bg-blue-500/10 text-blue-500 border-blue-500/20"
            }`}
          >
            {log.action.includes("SUSPEND") ? (
              <ShieldAlert className="w-4 h-4" />
            ) : log.action.includes("VERIF") ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Info className="w-4 h-4" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-start">
              <p className="text-white font-bold text-sm capitalize">
                {log.action.replace(/_/g, " ").toLowerCase()}
              </p>
              <span className="text-[10px] text-gray-500 whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>

            {/* Metadata Viewer */}
            {log.metadata && (
              <div className="mt-2 bg-black/30 p-2 rounded border border-gray-800 text-[10px] font-mono text-gray-400 overflow-x-auto">
                <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
