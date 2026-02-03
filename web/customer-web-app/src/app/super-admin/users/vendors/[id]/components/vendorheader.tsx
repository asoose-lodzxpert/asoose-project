import React from 'react';
import { ArrowLeft, MessageSquare, UserCheck, Edit, Save, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface VendorHeaderProps {
  name: string;
  status: string;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onBack: () => void;
  onMessage: () => void;
}

export default function VendorHeader({ name, status, isEditing, isSaving, onEdit, onSave, onBack, onMessage }: VendorHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-[#0F172A]/95 backdrop-blur-md border-b border-gray-800 py-4 -mx-4 px-4 md:-mx-6 md:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="w-full md:w-auto">
        <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-1 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to List
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl md:text-2xl font-bold text-white truncate max-w-[250px] md:max-w-none">{name}</h1>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border whitespace-nowrap ${status === 'ACTIVE' ? 'bg-green-500/20 text-green-500 border-green-500/20' : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20'}`}>
            {status}
          </span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap w-full md:w-auto">
        <button
          onClick={onMessage}
          className="flex-1 md:flex-none justify-center p-2 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 flex items-center" 
          title="Message Vendor"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="md:hidden ml-2 text-sm font-medium">Message</span>
        </button>
        
        {isEditing ? (
          <button onClick={onSave} disabled={isSaving} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 text-sm disabled:opacity-50">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        ) : (
          <button onClick={onEdit} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 text-sm">
            <Edit className="w-4 h-4" /> Edit
          </button>
        )}
      </div>
    </div>
  );
}