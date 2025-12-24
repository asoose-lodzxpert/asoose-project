'use client';

import React, { useState, useEffect } from 'react';
import { Save, Globe, DollarSign, Truck, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { SettingsData,DEFAULT_SETTINGS } from './component/data';

export default function SettingsPage() {
  const [formData, setFormData] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setFormData(data);
        } else {
          console.warn("Using default settings (API unavailable)");
          setFormData(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        setFormData(DEFAULT_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // --- Handlers ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleToggle = (key: keyof SettingsData) => {
    setFormData(prev => ({
      ...prev,
      [key]: !prev[key as keyof SettingsData] // Only works for booleans
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      Swal.fire({
        icon: 'success',
        title: 'Settings Saved',
        text: 'Platform configuration has been updated.',
        background: '#1E293B',
        color: '#fff',
        confirmButtonColor: '#eab308',
        timer: 1500
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Could not save settings. Please try again.',
        background: '#1E293B',
        color: '#fff'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-0">
      <h1 className="text-2xl font-bold text-white">Platform Settings</h1>

      {/* General Settings */}
      <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
         <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-blue-500" /> General</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
               <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Platform Name</label>
               <input 
                 type="text" 
                 name="platformName"
                 value={formData.platformName} 
                 onChange={handleChange}
                 className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none transition-colors" 
               />
            </div>
            <div>
               <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Support Email</label>
               <input 
                 type="email" 
                 name="supportEmail"
                 value={formData.supportEmail} 
                 onChange={handleChange}
                 className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none transition-colors" 
               />
            </div>
         </div>
      </div>

      {/* Financial Settings */}
      <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
         <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-500" /> Commission & Fees</h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
               <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Ride Commission (%)</label>
               <input 
                 type="number" 
                 name="rideCommission"
                 value={formData.rideCommission} 
                 onChange={handleChange}
                 className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none transition-colors" 
               />
            </div>
            <div>
               <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Food Commission (%)</label>
               <input 
                 type="number" 
                 name="foodCommission"
                 value={formData.foodCommission} 
                 onChange={handleChange}
                 className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none transition-colors" 
               />
            </div>
            <div>
               <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tax Rate (%)</label>
               <input 
                 type="number" 
                 name="taxRate"
                 value={formData.taxRate} 
                 onChange={handleChange}
                 className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-3 text-white focus:border-yellow-500 outline-none transition-colors" 
               />
            </div>
         </div>
      </div>

      {/* Operational Settings */}
      <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
         <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-orange-500" /> Operations</h2>
         <div className="space-y-4">
            
            {/* Auto-Assign Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg border border-gray-700">
               <div>
                  <p className="font-bold text-white">Auto-Assign Riders</p>
                  <p className="text-xs text-gray-500">Automatically match nearest rider to order</p>
               </div>
               <button 
                 onClick={() => handleToggle('autoAssignRiders')}
                 className={`w-12 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none ${
                   formData.autoAssignRiders ? 'bg-yellow-500' : 'bg-gray-600'
                 }`}
               >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                    formData.autoAssignRiders ? 'translate-x-6' : 'translate-x-0'
                  }`} />
               </button>
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg border border-gray-700">
               <div>
                  <p className="font-bold text-white">Maintenance Mode</p>
                  <p className="text-xs text-gray-500">Disable all new orders temporarily</p>
               </div>
               <button 
                 onClick={() => handleToggle('maintenanceMode')}
                 className={`w-12 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none ${
                   formData.maintenanceMode ? 'bg-red-500' : 'bg-gray-600'
                 }`}
               >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                    formData.maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                  }`} />
               </button>
            </div>

         </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={isSaving}
        className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
         {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
         {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}