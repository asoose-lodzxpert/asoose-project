'use client';

import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { 
  Eye, CheckCircle, XCircle, Search, RefreshCw, 
  FileText, Download, AlertTriangle, Loader2, X,
  MapPin, Truck, Store, User, ChevronLeft,
  ZoomIn, Calendar, Mail, Phone
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';

import { fetcher } from '../hooks/useSuperAdminFetch';
import { DataTable } from '@/app/super-admin/component/datatable';
import VerificationSkeleton from './skeleton';

// ===========================================================================
//  TYPES & INTERFACES
// ===========================================================================

interface VendorDocument {
  id: string;
  name: string;
  fileName: string;
  url: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  uploadedDate: string;
}

interface RiderDocument {
  id: string;
  type: string;
  url: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
}

interface StoreInfo {
  id: string;
  name: string;
  type: string;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
}

interface VendorRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  createdAt: string;
  store?: StoreInfo;
  documents: VendorDocument[];
}

interface RiderRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  createdAt: string;
  vehicle?: Vehicle;
  documents: RiderDocument[];
}

type VerificationRow = VendorRow | RiderRow;

interface VerificationResponse {
  data: VerificationRow[];
  total: number;
  page: number;
}

// Type Guards
function isVendorRow(row: VerificationRow): row is VendorRow {
  return 'store' in row;
}

function isRiderRow(row: VerificationRow): row is RiderRow {
  return 'vehicle' in row;
}

// ===========================================================================
//  MOBILE RENDERER
// ===========================================================================

const renderVerificationMobileCard = (
  row: VerificationRow, 
  onReview: (row: VerificationRow) => void
) => {
  const isVendor = isVendorRow(row);
  const secondaryInfo = isVendor 
    ? (row as VendorRow).store?.name 
    : (row as RiderRow).vehicle?.plateNumber;

  return (
    <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4 mb-3 space-y-4 hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 bg-slate-800 rounded-lg shrink-0">
            {isVendor ? <Store className="w-5 h-5 text-blue-400" /> : <Truck className="w-5 h-5 text-orange-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-white truncate">{row.name}</h4>
            <p className="text-xs text-gray-500 truncate">{row.email}</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-gray-600 uppercase shrink-0">
          {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800/50">
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Entity</p>
          <p className="text-sm text-gray-300 truncate">{secondaryInfo || 'N/A'}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Documents</p>
          <p className="text-sm text-blue-400">{row.documents?.length || 0} Uploaded</p>
        </div>
      </div>

      <button 
        onClick={() => onReview(row)}
        className="w-full py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
      >
        <Eye className="w-4 h-4" /> Review Credentials
      </button>
    </div>
  );
};

// ===========================================================================
//  MAIN COMPONENT
// ===========================================================================

export default function VerificationPage() {
  const [activeTab, setActiveTab] = useState<'vendor' | 'rider'>('vendor');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedEntity, setSelectedEntity] = useState<VerificationRow | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Server-Side Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Server-Side Data Fetching
  const { data, mutate, isLoading, error } = useSWR<VerificationResponse>(
    `/super-admin/verification?type=${activeTab}&search=${debouncedSearch}&page=${page}&limit=10`,
    fetcher,
    { keepPreviousData: true }
  );

  // ===========================================================================
  //  LOGIC HELPERS
  // ===========================================================================

  const getDocuments = (row: VerificationRow) => {
    if (isVendorRow(row)) {
      return row.documents.map(doc => ({
        id: doc.id,
        displayName: doc.name || doc.fileName,
        url: doc.url,
        status: doc.status
      }));
    }
    return row.documents.map(doc => ({
      id: doc.id,
      displayName: doc.type,
      url: doc.url,
      status: doc.status
    }));
  };

  const getSecondaryInfo = (row: VerificationRow) => {
    if (activeTab === 'vendor' && isVendorRow(row)) return row.store?.name || 'N/A';
    if (activeTab === 'rider' && isRiderRow(row)) return row.vehicle?.plateNumber || 'N/A';
    return '-';
  };

  // ===========================================================================
  //  HANDLERS
  // ===========================================================================

  const submitDecision = async (id: string, action: 'APPROVE' | 'REJECT', note?: string) => {
    const result = await Swal.fire({
      title: `${action === 'APPROVE' ? 'Approve' : 'Reject'} Application?`,
      text: `Are you sure you want to ${action.toLowerCase()} this ${activeTab} application?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: action === 'APPROVE' ? '#16a34a' : '#dc2626',
      cancelButtonColor: '#475569',
      confirmButtonText: `Yes, ${action.toLowerCase()} it!`,
      cancelButtonText: 'Cancel',
      background: '#1E293B',
      color: '#fff',
      customClass: {
        popup: 'border border-slate-800 rounded-2xl',
        confirmButton: 'font-bold px-6 py-2.5 rounded-xl',
        cancelButton: 'font-bold px-6 py-2.5 rounded-xl'
      }
    });

    if (!result.isConfirmed) return;

    setIsProcessing(true);
    
    // Optimistic UI Update
    mutate((current) => {
      if (!current) return undefined;
      return {
        ...current,
        data: current.data.filter(item => item.id !== id),
        total: current.total - 1
      };
    }, false);

    try {
      await fetcher(`/super-admin/verification/${activeTab}/${id}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({ action, note })
      });
      
      await Swal.fire({
        title: 'Success!',
        text: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} ${action.toLowerCase()}ed successfully`,
        icon: 'success',
        confirmButtonColor: '#3b82f6',
        background: '#1E293B',
        color: '#fff',
        customClass: {
          popup: 'border border-slate-800 rounded-2xl',
          confirmButton: 'font-bold px-6 py-2.5 rounded-xl'
        }
      });
      
      setSelectedEntity(null);
      setRejectionNote('');
    } catch (err) {
      await Swal.fire({
        title: 'Error!',
        text: 'Verification update failed. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3b82f6',
        background: '#1E293B',
        color: '#fff',
        customClass: {
          popup: 'border border-slate-800 rounded-2xl',
          confirmButton: 'font-bold px-6 py-2.5 rounded-xl'
        }
      });
      mutate(); // Rollback
    } finally {
      setIsProcessing(false);
    }
  };

  // ===========================================================================
  //  TABLE COLUMNS
  // ===========================================================================

  const columns = useMemo(() => [
    {
      accessorKey: "name",
      header: "Partner Identity",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-bold text-white">{row.original.name}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-tight">{row.original.email}</span>
        </div>
      )
    },
    {
      header: "Entity Reference",
      cell: ({ row }: any) => (
        <span className="text-sm text-gray-300">{getSecondaryInfo(row.original)}</span>
      )
    },
    {
      header: "Documentation",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2 text-blue-400">
          <FileText className="w-3 h-3" />
          <span className="text-xs font-bold">{row.original.documents?.length || 0} Files</span>
        </div>
      )
    },
    {
      id: "actions",
      header: "Compliance Action",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSelectedEntity(row.original)}
            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
            title="Perform Document Audit"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button 
            onClick={() => submitDecision(row.original.id, 'APPROVE')}
            className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ], [activeTab]);

  // ===========================================================================
  //  RENDER
  // ===========================================================================

  if (isLoading && !data) return <VerificationSkeleton />;

  return (
    <div className="min-h-screen bg-[#0F172A] p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <ToastContainer theme="dark" position="bottom-right" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white ">Verifications</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1 font-medium">Identity verification & credential auditing</p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-600" />
            <input 
              placeholder="Filter by name or email..."
              className="w-full bg-[#1E293B] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => mutate()} 
            className="p-2.5 sm:p-3 bg-slate-800 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900 rounded-xl w-full sm:w-fit border border-slate-800">
        {(['vendor', 'rider'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`flex-1 sm:flex-initial px-6 sm:px-8 py-2 text-xs font-black uppercase rounded-lg transition-all ${
              activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}s
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {error ? (
          <div className="p-12 sm:p-20 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500/20 mx-auto" />
            <p className="text-gray-400 font-bold text-sm sm:text-base">Database link interrupted</p>
            <button onClick={() => mutate()} className="px-6 py-2 bg-blue-600 rounded-lg text-white font-bold text-sm">Reconnect</button>
          </div>
        ) : !isLoading && data?.data.length === 0 ? (
          <div className="p-16 sm:p-24 text-center">
            <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-slate-800" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Queue Cleared</p>
            <p className="text-gray-600 text-sm mt-1">No pending {activeTab} registrations found.</p>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={data?.data || []} 
            pageSize={10}
            renderMobileCard={(row) => renderVerificationMobileCard(row, setSelectedEntity)}
          />
        )}
      </div>

      {/* Enhanced Document Review Drawer */}
      {selectedEntity && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            onClick={() => setSelectedEntity(null)} 
          />
          <div className="relative w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl bg-[#0F172A] h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-800">
            
            {/* Header - Fixed */}
            <div className="p-4 sm:p-6 lg:p-8 border-b border-slate-800 bg-[#0F172A] shrink-0">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <button 
                      onClick={() => setSelectedEntity(null)} 
                      className="lg:hidden p-2 bg-slate-900 rounded-lg border border-slate-800 text-gray-500 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight truncate">Audit Credentials</h2>
                  </div>
                  <p className="text-xs text-blue-500 font-bold truncate">Reviewing {selectedEntity.name}</p>
                </div>
                <button 
                  onClick={() => setSelectedEntity(null)} 
                  className="hidden lg:block p-2 bg-slate-900 rounded-full border border-slate-800 text-gray-500 hover:text-white transition-colors shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
              
              {/* Partner Information Card */}
              <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Partner Details</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Full Name</p>
                      <p className="text-sm text-white font-medium truncate">{selectedEntity.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                      <Mail className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Email Address</p>
                      <p className="text-sm text-white font-medium truncate">{selectedEntity.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                      <Phone className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Phone Number</p>
                      <p className="text-sm text-white font-medium">{selectedEntity.countryCode} {selectedEntity.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                      <Calendar className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Registration Date</p>
                      <p className="text-sm text-white font-medium">
                        {new Date(selectedEntity.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Entity Specific Info */}
                {isVendorRow(selectedEntity) && selectedEntity.store && (
                  <div className="flex items-start gap-3 pt-3 border-t border-slate-800/50">
                    <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                      <Store className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Store Information</p>
                      <p className="text-sm text-white font-medium truncate">{selectedEntity.store.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedEntity.store.type}</p>
                    </div>
                  </div>
                )}

                {isRiderRow(selectedEntity) && selectedEntity.vehicle && (
                  <div className="flex items-start gap-3 pt-3 border-t border-slate-800/50">
                    <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                      <Truck className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Vehicle Information</p>
                      <p className="text-sm text-white font-medium">{selectedEntity.vehicle.brand} {selectedEntity.vehicle.model}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Plate: {selectedEntity.vehicle.plateNumber}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Documents Gallery */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Submitted Documents</p>
                  <span className="text-xs text-blue-400 font-bold">{getDocuments(selectedEntity).length} Files</span>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {getDocuments(selectedEntity).map((doc) => (
                    <div key={doc.id} className="group bg-[#1E293B] border border-slate-800 rounded-2xl overflow-hidden transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10">
                      <div className="p-3 sm:p-4 bg-slate-800/30 flex justify-between items-center border-b border-slate-800/50">
                        <span className="text-[10px] sm:text-xs font-black text-blue-400 uppercase tracking-wider truncate mr-2">{doc.displayName}</span>
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="p-1.5 bg-slate-900 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                      <div 
                        className="relative aspect-video bg-slate-900 cursor-pointer overflow-hidden"
                        onClick={() => setSelectedImage(doc.url)}
                      >
                        <img 
                          src={doc.url} 
                          alt="Credential Preview" 
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance Notes */}
              <div>
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-3 block">Compliance Notes</label>
                <textarea 
                  className="w-full bg-[#1E293B] border border-slate-800 rounded-2xl p-4 sm:p-5 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] resize-none transition-all placeholder:text-gray-700"
                  placeholder="Enter rejection reason or approval context..."
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons - Fixed Bottom */}
            <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-800 bg-[#0F172A] shrink-0">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button 
                  disabled={isProcessing}
                  onClick={() => submitDecision(selectedEntity.id, 'REJECT', rejectionNote)}
                  className="flex items-center justify-center gap-2 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span className="hidden sm:inline">Reject</span>
                  <span className="sm:hidden">Reject</span>
                </button>
                <button 
                  disabled={isProcessing}
                  onClick={() => submitDecision(selectedEntity.id, 'APPROVE', rejectionNote)}
                  className="flex items-center justify-center gap-2 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span className="hidden sm:inline">Approve</span>
                  <span className="sm:hidden">Approve</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-3 bg-slate-900/80 rounded-full border border-slate-700 text-white hover:bg-slate-800 transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={selectedImage} 
            alt="Full size preview" 
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}