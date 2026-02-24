import React, { useState } from "react";
import {
  ArrowLeft,
  MessageSquare,
  Edit,
  Save,
  Loader2,
  MoreVertical,
  X,
  Zap,
} from "lucide-react";

interface VendorHeaderProps {
  name: string;
  status: string;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onBack: () => void;
  onMessage: () => void;
}

export default function VendorHeader({
  name,
  status,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  onBack,
  onMessage,
}: VendorHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isActive = status === "ACTIVE";

  const statusConfig = {
    ACTIVE: {
      bg: "bg-gradient-to-r from-emerald-500/10 to-teal-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-300",
      dot: "bg-emerald-500",
      label: "Active",
    },
    PENDING: {
      bg: "bg-gradient-to-r from-amber-500/10 to-yellow-500/10",
      border: "border-amber-500/30",
      text: "text-amber-300",
      dot: "bg-amber-500",
      label: "Pending",
    },
    INACTIVE: {
      bg: "bg-gradient-to-r from-slate-500/10 to-gray-500/10",
      border: "border-slate-500/30",
      text: "text-slate-300",
      dot: "bg-slate-500",
      label: "Inactive",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.INACTIVE;

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 py-4 -mx-4 px-4 md:-mx-6 md:px-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Left Section: Back Button & Title */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={onBack}
            className="mt-1 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200 flex-shrink-0"
            title="Back to vendors list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-white truncate leading-tight">
              {name}
            </h1>
            <p className="text-sm text-slate-400 mt-1">Vendor Details</p>
          </div>
        </div>

        {/* Right Section: Status & Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Status Badge */}
          <div
            className={`${config.bg} ${config.border} border rounded-lg px-3 py-2 flex items-center gap-2 backdrop-blur-sm`}
          >
            <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`}></span>
            <span className={`${config.text} text-sm font-semibold tracking-wide uppercase`}>
              {config.label}
            </span>
          </div>

          {/* Action Buttons */}
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={isSaving}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {/* Message Button */}
              <button
                onClick={onMessage}
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium text-sm hidden sm:flex"
                title="Message vendor"
              >
                <MessageSquare className="w-4 h-4" />
                Message
              </button>

              {/* Edit Button */}
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-semibold text-sm rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>

              {/* Mobile Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 sm:hidden"
                >
                  {showMenu ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <MoreVertical className="w-5 h-5" />
                  )}
                </button>

                {/* Mobile Menu Dropdown */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => {
                        onMessage();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors text-left text-sm flex items-center gap-3 font-medium border-b border-slate-700/50"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Send Message
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}