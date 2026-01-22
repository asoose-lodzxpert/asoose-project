'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import useSWR, { mutate } from 'swr';
import { Trash2, Map as MapIcon, Save, Plus, Loader2, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { getSession } from 'next-auth/react'; // ✅ Import NextAuth
import { fetcher } from '../../hooks/useSuperAdminFetch';

// --- 1. Dynamic Import ---
// We must import the MapEditor dynamically because Leaflet depends on 'window',
// which is not available during Next.js server-side rendering.
const MapEditor = dynamic(() => import('../../component/mapEditor'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#0F172A] border border-gray-800 rounded-xl text-gray-500">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Map...
    </div>
  )
});

// --- Types ---
interface Zone {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  coordinates: { lat: number; lng: number }[];
}

export default function ServiceZonesPage() {
  // --- State ---
  const [isCreating, setIsCreating] = useState(false);
  const [resetDrawing, setResetDrawing] = useState(false);
  
  // Form State
  const [zoneName, setZoneName] = useState('');
  const [zoneDesc, setZoneDesc] = useState('');
  const [zoneCoords, setZoneCoords] = useState<{lat: number, lng: number}[]>([]);

  // --- Data Fetching ---
  const { data: zones, isLoading } = useSWR<Zone[]>('/super-admin/zones', fetcher);

  // --- Handlers ---

  const handleStartCreating = () => {
    setIsCreating(true);
    setZoneName('');
    setZoneDesc('');
    setZoneCoords([]);
    setResetDrawing(prev => !prev); // Signals map to clear old drawings
  };

  const handleCancelCreating = () => {
    setIsCreating(false);
    setResetDrawing(prev => !prev);
  };

  const handleSaveZone = async () => {
    // 1. Validation
    if (!zoneName.trim()) return toast.error('Zone name is required');
    if (zoneCoords.length < 3) return toast.error('Please draw a valid polygon (at least 3 points)');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // ✅ Get Session via NextAuth
      const session = await getSession();
      const token = (session as any)?.accessToken;
      
      // 2. API Call
      const res = await fetch(`${API_URL}/super-admin/zones`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}` // ✅ Use Token
        },
        body: JSON.stringify({
          name: zoneName,
          description: zoneDesc,
          coordinates: zoneCoords,
          isActive: true
        })
      });

      if (!res.ok) throw new Error('Failed to create zone');

      // 3. Success Feedback
      toast.success('Service Zone created successfully');
      mutate('/super-admin/zones'); // Refresh the list immediately
      handleCancelCreating(); // Close form
      
    } catch (e) {
      console.error(e);
      toast.error('Failed to create zone');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: `Delete ${name}?`,
      text: "Users in this area will no longer be able to request services.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Delete',
      background: '#1E293B', color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        
        // ✅ Get Session via NextAuth
        const session = await getSession();
        const token = (session as any)?.accessToken;

        await fetch(`${API_URL}/super-admin/zones/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token || ''}` } // ✅ Use Token
        });

        mutate('/super-admin/zones');
        toast.success('Zone deleted');
      } catch (e) {
        toast.error('Could not delete zone');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20 flex flex-col h-screen">
      
      {/* --- Header --- */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapIcon className="w-6 h-6 text-blue-500" /> Service Zones
          </h1>
          <p className="text-gray-400 text-sm">Define geofenced areas where your platform operates.</p>
        </div>
        
        {!isCreating && (
          <button 
            onClick={handleStartCreating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Add New Zone
          </button>
        )}
      </div>

      {/* --- Main Content Area (Flex Row) --- */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: List or Editor */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Creation Form */}
          {isCreating && (
            <div className="bg-[#1E293B] border border-blue-500/50 p-5 rounded-xl animate-in slide-in-from-left-5 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> New Zone
                </h3>
                <button onClick={handleCancelCreating} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Zone Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Abuja Central"
                    value={zoneName}
                    onChange={e => setZoneName(e.target.value)}
                    className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Description (Optional)</label>
                  <textarea 
                    rows={2}
                    placeholder="e.g. High demand area, includes Wuse II"
                    value={zoneDesc}
                    onChange={e => setZoneDesc(e.target.value)}
                    className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none transition-colors resize-none"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-200">
                    <p className="font-bold mb-1">How to Draw:</p>
                    <ul className="list-disc pl-4 space-y-1 opacity-80">
                      <li>Click anywhere on the map to add a point.</li>
                      <li>Add at least 3 points to form a shape.</li>
                      <li>The shape will close automatically.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={handleSaveZone}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-sm"
                  >
                    <Save className="w-4 h-4" /> Save Zone
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Existing Zones List */}
          <div className="space-y-3 pb-10">
            {isLoading ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Loader2 className="animate-spin text-blue-500" />
                <span className="text-gray-500 text-sm">Loading zones...</span>
              </div>
            ) : zones?.length === 0 && !isCreating ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-800 rounded-xl">
                <MapIcon className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500">No zones defined yet.</p>
                <button onClick={handleStartCreating} className="text-blue-500 text-sm font-bold mt-2 hover:underline">Create your first zone</button>
              </div>
            ) : (
              zones?.map((zone) => (
                <div key={zone.id} className="bg-[#1E293B] border border-gray-800 p-4 rounded-xl flex justify-between items-center group hover:border-gray-600 transition-colors">
                  <div>
                    <h4 className="text-white font-bold text-sm">{zone.name}</h4>
                    {zone.description && <p className="text-xs text-gray-500 truncate max-w-[200px]">{zone.description}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`w-2 h-2 rounded-full ${zone.isActive ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{zone.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(zone.id, zone.name)}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete Zone"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Map Editor */}
        <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden border border-gray-800 relative shadow-2xl min-h-[400px]">
          
          <MapEditor 
            existingZones={zones || []}
            isDrawing={isCreating}
            onPolygonChange={setZoneCoords}
            resetDrawing={resetDrawing}
          />
          
          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 right-4 bg-[#0F172A]/90 backdrop-blur-md p-3 rounded-lg border border-gray-700 text-xs z-[400] shadow-lg">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-3 h-3 bg-green-500 rounded-sm opacity-50 border border-green-400"></div> 
                <span className="text-gray-300 font-medium">Active Zone</span>
              </div>
              {isCreating && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-blue-500 border-dashed rounded-sm"></div> 
                  <span className="text-blue-300 font-bold animate-pulse">Drawing Now...</span>
                </div>
              )}
          </div>
        </div>

      </div>
    </div>
  );
}