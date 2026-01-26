'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { 
  Eye, CheckCircle, XCircle, FileText, Download, 
  Loader2, X, MapPin, Truck, Store, User, 
  ChevronLeft, ZoomIn, Calendar, Mail, Phone, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { fetcher } from '../../hooks/useSuperAdminFetch';

// --- Shared Types ---
interface Document {
  id: string;
  name?: string;
  type?: string;
  fileName?: string;
  url: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

interface EntityInfo {
  id: string;
  name: string;
  type?: string;
  plateNumber?: string;
  brand?: string;
  model?: string;
}

interface VerificationEntity {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  createdAt: string;
  store?: EntityInfo;
  vehicle?: EntityInfo;
  documents: Document[];
}

export default function VerificationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: entity, isLoading, error } = useSWR<VerificationEntity>(
    id ? `/super-admin/verification/${id}` : null, 
    fetcher
  );

  const isVendor = entity?.store !== undefined;
  const entityType = isVendor ? 'vendor' : 'rider';

  const getDocuments = (row: VerificationEntity) => {
    return row.documents.map(doc => ({
      id: doc.id,
      displayName: doc.name || doc.type || 'Document',
      url: doc.url,
      status: doc.status
    }));
  };

  const submitDecision = async (action: 'APPROVE' | 'REJECT') => {
    const result = await Swal.fire({
      title: `${action === 'APPROVE' ? 'Approve' : 'Reject'} Application?`,
      text: `Are you sure you want to ${action.toLowerCase()} this ${entityType} application?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: action === 'APPROVE' ? '#16a34a' : '#dc2626',
      cancelButtonColor: '#475569',
      confirmButtonText: `Yes, ${action.toLowerCase()} it!`,
      background: '#1E293B', 
      color: '#fff'
    });

    if (!result.isConfirmed) return;

    setIsProcessing(true);

    try {
      await fetcher(`/super-admin/verification/${entityType}/${id}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({ action, note: rejectionNote })
      });

      toast.success(`${entityType} ${action.toLowerCase()}ed successfully`);
      router.push('/super-admin/verification');
      
    } catch (err) {
      toast.error('Verification update failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <VerificationDetailSkeleton />;
  if (error || !entity) return <ErrorState onRetry={() => window.location.reload()} />;

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 lg:p-8 pb-24">
      {/* --- Header --- */}
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4 mb-6 lg:mb-8">
          <button 
            onClick={() => router.back()}
            className="p-2 bg-[#1E293B] border border-gray-800 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl lg:text-3xl font-bold text-white flex items-center gap-3">
              Verification Details
              <span className={`text-xs px-3 py-1 rounded-full border ${isVendor ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-orange-500/30 bg-orange-500/10 text-orange-400'}`}>
                {isVendor ? 'VENDOR' : 'RIDER'}
              </span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Reviewing credentials for <span className="text-white font-medium">{entity.name}</span>
            </p>
          </div>
        </div>

        {/* --- Responsive Grid Layout --- */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* --- Left Sidebar: Personal & Business Info (Desktop: 4 cols, Tablet/Mobile: full width) --- */}
          <div className="xl:col-span-4 space-y-6">
            {/* Personal Info Card */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile Information
              </h3>
              
              <div className="space-y-4">
                <InfoRow 
                  icon={<User className="text-blue-400 w-4 h-4" />} 
                  label="Full Name" 
                  value={entity.name} 
                />
                <InfoRow 
                  icon={<Mail className="text-green-400 w-4 h-4" />} 
                  label="Email Address" 
                  value={entity.email} 
                />
                <InfoRow 
                  icon={<Phone className="text-purple-400 w-4 h-4" />} 
                  label="Phone Number" 
                  value={`${entity.countryCode} ${entity.phone}`} 
                />
                <InfoRow 
                  icon={<Calendar className="text-orange-400 w-4 h-4" />} 
                  label="Registered On" 
                  value={new Date(entity.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} 
                />
              </div>
            </div>

            {/* Business / Vehicle Info Card */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                {isVendor ? <Store className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                {isVendor ? 'Store Details' : 'Vehicle Details'}
              </h3>
              
              {isVendor && entity.store ? (
                <div className="space-y-4">
                  <InfoRow 
                    icon={<Store className="text-blue-400 w-4 h-4" />} 
                    label="Store Name" 
                    value={entity.store.name} 
                  />
                  <InfoRow 
                    icon={<FileText className="text-gray-400 w-4 h-4" />} 
                    label="Store Type" 
                    value={entity.store.type || 'N/A'} 
                  />
                </div>
              ) : !isVendor && entity.vehicle ? (
                <div className="space-y-4">
                  <InfoRow 
                    icon={<Truck className="text-orange-400 w-4 h-4" />} 
                    label="Vehicle" 
                    value={`${entity.vehicle.brand} ${entity.vehicle.model}`} 
                  />
                  <InfoRow 
                    icon={<FileText className="text-gray-400 w-4 h-4" />} 
                    label="Plate Number" 
                    value={entity.vehicle.plateNumber || 'N/A'} 
                  />
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No additional details provided.</p>
              )}
            </div>
          </div>

          {/* --- Center/Right: Documents & Actions (Desktop: 8 cols) --- */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* Document Gallery */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Submitted Documents
                </h3>
                <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full text-xs font-bold border border-blue-500/20">
                  {getDocuments(entity).length} Files
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {getDocuments(entity).map((doc) => (
                  <div 
                    key={doc.id} 
                    className="group bg-[#0F172A] border border-gray-800 rounded-xl overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all"
                  >
                    <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                      <span className="text-xs font-bold text-gray-300 uppercase truncate pr-2">
                        {doc.displayName}
                      </span>
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-gray-500 hover:text-white transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                    <div 
                      className="relative h-48 bg-gray-900 cursor-pointer overflow-hidden flex items-center justify-center"
                      onClick={() => setSelectedImage(doc.url)}
                    >
                      <img 
                        src={doc.url} 
                        alt={doc.displayName} 
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
                        <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all w-8 h-8" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Decision Panel - Desktop Only */}
            <div className="hidden lg:block bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Review Decision
              </h3>
              
              <textarea 
                className="w-full bg-[#0F172A] border border-gray-800 rounded-xl p-4 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-h-[120px] mb-4 resize-none placeholder:text-gray-600"
                placeholder="Enter rejection reason or approval notes (optional)..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => submitDecision('REJECT')}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 py-3.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold hover:bg-red-500/20 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  Reject Application
                </button>
                <button 
                  onClick={() => submitDecision('APPROVE')}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Approve Application
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Mobile Action Bar (Sticky Bottom) --- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-[#0F172A]/95 backdrop-blur-md border-t border-gray-800 z-40 shadow-2xl">
        <textarea 
          className="w-full bg-[#1E293B] border border-gray-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-3 resize-none h-20 placeholder:text-gray-600"
          placeholder="Reason for decision (optional)..."
          value={rejectionNote}
          onChange={(e) => setRejectionNote(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => submitDecision('REJECT')} 
            disabled={isProcessing}
            className="py-3 bg-red-600/10 text-red-500 font-bold rounded-xl border border-red-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="animate-spin w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            Reject
          </button>
          <button 
            onClick={() => submitDecision('APPROVE')} 
            disabled={isProcessing}
            className="py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            Approve
          </button>
        </div>
      </div>

      {/* --- Image Lightbox --- */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm" 
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={selectedImage} 
            className="max-w-full max-h-screen rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
            alt="Document preview"
          />
        </div>
      )}
    </div>
  );
}

// --- Helper Components ---

function InfoRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-gray-800/50 rounded-lg shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">
          {label}
        </p>
        <p className="text-sm text-white font-medium break-words">
          {value || 'N/A'}
        </p>
      </div>
    </div>
  );
}

function VerificationDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 lg:p-8 pb-24">
      <div className="max-w-[1600px] mx-auto">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 mb-6 lg:mb-8">
          <div className="w-10 h-10 bg-gray-800 rounded-lg animate-pulse"></div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-7 w-48 bg-gray-800 rounded animate-pulse"></div>
              <div className="h-6 w-20 bg-gray-800 rounded-full animate-pulse"></div>
            </div>
            <div className="h-4 w-64 bg-gray-800 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Left Sidebar Skeleton */}
          <div className="xl:col-span-4 space-y-6">
            {/* Personal Info Card Skeleton */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-4 h-4 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-3 w-32 bg-gray-700 rounded animate-pulse"></div>
              </div>
              
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-800/50 rounded-lg animate-pulse shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-2.5 w-20 bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-4 w-full bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Business/Vehicle Info Card Skeleton */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-4 h-4 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-3 w-28 bg-gray-700 rounded animate-pulse"></div>
              </div>
              
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-800/50 rounded-lg animate-pulse shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-2.5 w-16 bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-4 w-3/4 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content Skeleton */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* Documents Card Skeleton */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-5 w-40 bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="h-7 w-16 bg-gray-700 rounded-full animate-pulse"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-[#0F172A] border border-gray-800 rounded-xl overflow-hidden">
                    <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                      <div className="h-3 w-24 bg-gray-700 rounded animate-pulse"></div>
                      <div className="w-4 h-4 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div className="h-48 bg-gray-900 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Decision Panel Skeleton - Desktop Only */}
            <div className="hidden lg:block bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-4 h-4 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-3 w-32 bg-gray-700 rounded animate-pulse"></div>
              </div>
              
              <div className="h-32 bg-[#0F172A] border border-gray-800 rounded-xl mb-4 animate-pulse"></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="h-14 bg-red-500/10 border border-red-500/20 rounded-xl animate-pulse"></div>
                <div className="h-14 bg-green-600/20 rounded-xl animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Action Bar Skeleton */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-[#0F172A]/95 backdrop-blur-md border-t border-gray-800 z-40">
        <div className="h-20 bg-[#1E293B] border border-gray-700 rounded-lg mb-3 animate-pulse"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-red-600/10 border border-red-600/20 rounded-xl animate-pulse"></div>
          <div className="h-12 bg-green-600/20 rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-red-500/10 p-6 rounded-full mb-4 border border-red-500/20">
        <AlertTriangle className="w-12 h-12 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Verification Not Found</h2>
      <p className="text-gray-400 mb-6 max-w-md">
        The verification request you are looking for may have been deleted or already processed.
      </p>
      <button 
        onClick={onRetry} 
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}