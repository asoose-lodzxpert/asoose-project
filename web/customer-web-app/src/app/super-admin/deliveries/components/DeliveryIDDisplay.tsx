"use client";

import React, { useState } from "react";
import { Copy, Info } from "lucide-react";
import { toast } from "react-toastify";
import { formatTrackingId } from "@/lib/formatDeliveryId";

interface TrackingIDDisplayProps {
  fullId: string;
  className?: string;
  showCopy?: boolean;
  showTooltip?: boolean;
  truncateTooltip?: boolean;
  variant?: "compact" | "detailed";
  prefix?: "track#" | "del#";
}

/**
 * Reusable component for displaying tracking/delivery IDs in a user-friendly format
 * 
 * Features:
 * - Displays shortened format: track#XYZ or del#XYZ
 * - Copy-to-clipboard button for full ID
 * - Hover tooltip showing full ID or expandable view
 * - Consistent styling across the application
 * - Supports both tracking and delivery ID formats
 * 
 * Usage:
 *  <TrackingIDDisplay fullId={delivery.id} showCopy showTooltip />
 *  <TrackingIDDisplay fullId={delivery.id} prefix="del#" variant="detailed" showCopy />
 */
export const TrackingIDDisplay: React.FC<TrackingIDDisplayProps> = ({
  fullId,
  className = "",
  showCopy = true,
  showTooltip = true,
  truncateTooltip = true,
  variant = "compact",
  prefix = "track#",
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const shortId = formatTrackingId(fullId, "short", prefix);
  const displayFullId = truncateTooltip ? `${fullId.substring(0, 8)}...` : fullId;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullId);
    toast.success("Tracking ID copied", {
      autoClose: 1000,
      hideProgressBar: true,
    });
  };

  if (variant === "detailed") {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-gray-400 text-xs">Tracking ID</p>
          {showCopy && (
            <button
              onClick={copyToClipboard}
              className="p-1.5 rounded bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Copy full tracking ID"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-white font-bold text-lg font-mono">{shortId}</p>
          {showTooltip && (
            <p className="text-gray-500 text-xs font-mono break-all">{displayFullId}</p>
          )}
        </div>
      </div>
    );
  }

  // Compact variant
  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
    >
      <div className="flex items-center gap-2">
        <span className="text-yellow-500 font-mono font-bold text-xs hover:underline cursor-help">
          {shortId}
        </span>

        {showCopy && (
          <button
            onClick={copyToClipboard}
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
            title="Copy full tracking ID"
          >
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Tooltip - Shows full tracking ID on hover */}
      {showTooltip && isTooltipVisible && (
        <div className="absolute left-0 bottom-full mb-2 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs font-mono text-gray-300 whitespace-nowrap z-50 shadow-lg max-w-xs">
          <div className="flex items-center gap-2">
            <Info className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="break-all">{displayFullId}</span>
          </div>
          <div className="absolute top-full left-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

// Alias for backward compatibility
export const DeliveryIDDisplay = TrackingIDDisplay;
