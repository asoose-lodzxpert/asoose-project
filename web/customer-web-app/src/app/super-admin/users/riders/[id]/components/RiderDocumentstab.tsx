import React from 'react';
import { FileText, Eye, Check, X, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

interface Document {
  id: string;
  type: string;
  url: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  updatedAt?: string;
}

interface RiderDocumentsTabProps {
  documents: Document[];
  onVerify: (docId: string, status: 'VERIFIED' | 'REJECTED') => void;
}

export const RiderDocumentsTab: React.FC<RiderDocumentsTabProps> = ({ documents, onVerify }) => {
  
  const handleView = (doc: Document) => {
    Swal.fire({
      title: doc.type,
      imageUrl: doc.url,
      imageAlt: doc.type,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Approve',
      denyButtonText: 'Reject',
      confirmButtonColor: '#10B981',
      denyButtonColor: '#EF4444',
      background: '#1E293B',
      color: '#fff',
      imageHeight: 400,
    }).then((result) => {
      if (result.isConfirmed) onVerify(doc.id, 'VERIFIED');
      else if (result.isDenied) onVerify(doc.id, 'REJECTED');
    });
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="p-10 text-center text-gray-500 flex flex-col items-center">
        <FileText className="w-12 h-12 mb-3 opacity-20" />
        <p>No documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-1 gap-4">
      {documents.map((doc) => (
        <div key={doc.id} className="flex flex-col md:flex-row justify-between items-center bg-[#0F172A] p-4 rounded-xl border border-gray-800 gap-4 transition-all hover:border-gray-700">
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-3 bg-gray-800 rounded-lg text-gray-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white font-bold">{doc.type}</p>
              <div className="flex items-center gap-2 mt-1">
                 <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    doc.status === 'VERIFIED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                    doc.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                 }`}>
                    {doc.status}
                 </span>
                 {doc.updatedAt && <span className="text-xs text-gray-500">{new Date(doc.updatedAt).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => handleView(doc)} className="flex-1 md:flex-none px-3 py-2 text-xs font-bold bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center justify-center gap-2">
               <Eye className="w-3 h-3" /> View
            </button>
            
            {doc.status === 'PENDING' && (
              <>
                <button onClick={() => onVerify(doc.id, 'VERIFIED')} className="flex-1 md:flex-none px-3 py-2 text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 rounded hover:bg-green-500 hover:text-white flex items-center justify-center gap-2">
                   <Check className="w-3 h-3" /> Approve
                </button>
                <button onClick={() => onVerify(doc.id, 'REJECTED')} className="flex-1 md:flex-none px-3 py-2 text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500 hover:text-white flex items-center justify-center gap-2">
                   <X className="w-3 h-3" /> Reject
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};