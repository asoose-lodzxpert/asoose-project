'use client';

import React, { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '../hooks/useSuperAdminFetch';
import { createClient } from '../../../../utils/supabase/client';
import { 
  Settings, Users, CreditCard, Shield, Truck, 
  Save, Lock, Plus, Trash2, Smartphone,
  CheckCircle, X, Loader2, Mail, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

// --- Types ---
interface SystemSettingDef {
  category: string;
  key: string;
  label: string;
  type: 'toggle' | 'input' | 'percentage' | 'currency';
  description?: string;
  defaultValue: any; // Fallback if DB is empty
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

// --- Constants ---
const ROLES = [
  { value: 'ADMIN_MANAGER', label: 'Operations Manager', desc: 'Can manage Riders, Vendors, and Orders.' },
  { value: 'ADMIN_SUPPORT', label: 'Support Agent', desc: 'Can view Disputes and basic Order info.' },
  { value: 'ADMIN_FINANCE', label: 'Finance Officer', desc: 'View Payouts and Transactions only.' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Full access to everything.' },
];

// Definitions describe HOW to render the setting. 
// The actual VALUE comes from the database.
const SETTING_DEFINITIONS: SystemSettingDef[] = [
  { category: 'General', key: 'maintenance_mode', label: 'Maintenance Mode', type: 'toggle', description: 'Disable customer apps temporarily', defaultValue: false },
  { category: 'General', key: 'support_phone', label: 'Support Phone', type: 'input', defaultValue: '+234 800 000 0000' },
  { category: 'Financials', key: 'global_commission', label: 'Global Commission', type: 'percentage', description: 'Platform fee per transaction', defaultValue: 10 },
  { category: 'Financials', key: 'min_withdrawal', label: 'Min Payout Limit', type: 'currency', defaultValue: 5000 },
  { category: 'Logistics', key: 'base_fare_bike', label: 'Bike Base Fare', type: 'currency', defaultValue: 500 },
  { category: 'Logistics', key: 'cost_per_km', label: 'Cost Per KM', type: 'currency', defaultValue: 100 },
  { category: 'Logistics', key: 'search_radius', label: 'Driver Search Radius (KM)', type: 'input', defaultValue: 10 },
];

const TABS = [
  { id: 'General', icon: Smartphone, label: 'General' },
  { id: 'Financials', icon: CreditCard, label: 'Financials' },
  { id: 'Logistics', icon: Truck, label: 'Logistics & Pricing' },
  { id: 'Team', icon: Users, label: 'Team & Access' },
  { id: 'Security', icon: Lock, label: 'Security' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('General');
  
  // State holds the merged values (Definitions + DB Values)
  const [localSettings, setLocalSettings] = useState<{ key: string, value: any }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // --- Data Fetching ---
  const { data: admins, isLoading: isLoadingAdmins } = useSWR<AdminUser[]>('/super-admin/admins', fetcher);
  const { data: remoteSettings, mutate: mutateSettings } = useSWR<any[]>('/super-admin/settings', fetcher);

  // --- Synchronization Effect ---
  // When remote data loads, merge it with definitions to set local state
  useEffect(() => {
    const merged = SETTING_DEFINITIONS.map(def => {
      // Find matching key from DB
      const remote = remoteSettings?.find(r => r.key === def.key);
      let value = def.defaultValue;

      if (remote) {
        // Parse strings from DB back to correct types
        if (def.type === 'toggle') value = remote.value === 'true';
        else if (def.type === 'currency' || def.type === 'percentage') value = Number(remote.value);
        else value = remote.value;
      }

      return { key: def.key, value };
    });
    setLocalSettings(merged);
  }, [remoteSettings]);

  // --- Handlers: Settings ---
  
  const getSettingValue = (key: string) => {
    return localSettings.find(s => s.key === key)?.value;
  };

  const handleSettingChange = (key: string, newValue: any) => {
    setLocalSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Prepare payload: Filter only settings belonging to current definitions
      const payload = localSettings.map(s => ({
        key: s.key,
        value: String(s.value) // Convert everything to string for DB storage
      }));

      const res = await fetch(`${API_URL}/super-admin/settings`, {
        method: 'PATCH',
        headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ settings: payload })
      });

      if (!res.ok) throw new Error('Failed to save settings');

      toast.success('System settings saved successfully');
      mutateSettings(); // Refresh from server
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Team Management State ---
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', role: 'ADMIN_SUPPORT' });

  // --- Handlers: Team Management ---
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingAdmin(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const res = await fetch(`${API_URL}/super-admin/admins`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(newAdmin)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed');
      }

      toast.success('Admin created successfully');
      mutate('/super-admin/admins');
      setIsTeamModalOpen(false);
      setNewAdmin({ name: '', email: '', password: '', role: 'ADMIN_SUPPORT' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    const result = await Swal.fire({
      title: 'Revoke Access?',
      text: "This user will lose access immediately.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      background: '#1E293B', color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        
        await fetch(`${API_URL}/super-admin/admins/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        
        mutate('/super-admin/admins');
        toast.success('Access revoked');
      } catch(e) { toast.error('Failed to delete'); }
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
            <p className="text-gray-400 text-sm">Configure logic, pricing, and admin access.</p>
          </div>
          {activeTab !== 'Team' && (
            <button 
              onClick={saveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT: Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-gray-400 hover:bg-[#1E293B] hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* RIGHT: Content Area */}
          <div className="lg:col-span-3">
            
            {/* --- TEAM TAB --- */}
            {activeTab === 'Team' ? (
              <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">Admin Users</h2>
                    <p className="text-gray-400 text-sm">Manage who has access to the dashboard.</p>
                  </div>
                  <button 
                    onClick={() => setIsTeamModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500 hover:text-white transition-colors text-sm font-bold"
                  >
                    <Plus className="w-4 h-4" /> Add Admin
                  </button>
                </div>

                <div className="space-y-4">
                  {isLoadingAdmins ? (
                      <div className="text-center py-10 text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2"/>Loading team...</div>
                  ) : admins?.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-4 bg-[#0F172A] border border-gray-800 rounded-xl group hover:border-gray-700 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center font-bold text-white border border-gray-600">
                          {admin.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">{admin.name}</p>
                          <p className="text-gray-500 text-xs flex items-center gap-1"><Mail className="w-3 h-3"/> {admin.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${
                          admin.role === 'SUPER_ADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          admin.role === 'ADMIN_FINANCE' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {admin.role.replace('ADMIN_', '')}
                        </span>
                        
                        {admin.role !== 'SUPER_ADMIN' && (
                          <button 
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Revoke Access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl text-xs text-gray-400">
                  <p className="font-bold text-blue-400 mb-2 flex items-center gap-2"><Shield className="w-3 h-3" /> Role Definitions:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    {ROLES.map(r => <li key={r.value}><span className="text-gray-300 font-bold">{r.label}:</span> {r.desc}</li>)}
                  </ul>
                </div>
              </div>
            ) : (
              /* --- DYNAMIC SETTINGS TABS --- */
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {SETTING_DEFINITIONS.filter(s => s.category === activeTab).length === 0 ? (
                    <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-12 text-center">
                        <Lock className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                        <h3 className="text-white font-bold">Coming Soon</h3>
                        <p className="text-gray-500">This configuration module is under development.</p>
                    </div>
                ) : (
                    SETTING_DEFINITIONS.filter(s => s.category === activeTab).map((def) => {
                      const currentValue = getSettingValue(def.key) ?? def.defaultValue;
                      
                      return (
                        <div key={def.key} className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="max-w-lg">
                              <h3 className="text-white font-bold mb-1">{def.label}</h3>
                              {def.description && <p className="text-gray-400 text-sm">{def.description}</p>}
                            </div>

                            <div className="w-full md:w-auto min-w-[200px]">
                            {def.type === 'toggle' ? (
                                <button 
                                onClick={() => handleSettingChange(def.key, !currentValue)}
                                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${currentValue ? 'bg-green-500' : 'bg-gray-700'}`}
                                >
                                <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${currentValue ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            ) : (
                                <div className="relative">
                                {def.type === 'currency' && <span className="absolute left-3 top-2.5 text-gray-500 text-sm">₦</span>}
                                {def.type === 'percentage' && <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>}
                                
                                <input 
                                    type={def.type === 'input' ? 'text' : 'number'}
                                    value={currentValue?.toString() || ''}
                                    onChange={(e) => handleSettingChange(def.key, e.target.value)}
                                    className={`w-full bg-[#0F172A] border border-gray-700 rounded-lg py-2 text-white text-sm focus:border-blue-500 outline-none
                                    ${def.type === 'currency' ? 'pl-8' : 'pl-3'}
                                    ${def.type === 'percentage' ? 'pr-8' : 'pr-3'}
                                    `}
                                />
                                </div>
                            )}
                            </div>
                        </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- ADD ADMIN MODAL --- */}
        {isTeamModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-[#1E293B] border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">Add New Team Member</h2>
                        <button onClick={() => setIsTeamModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <form onSubmit={handleCreateAdmin} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400">Full Name</label>
                                <input required type="text" className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="John Doe"
                                    value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400">Email Address</label>
                                <input required type="email" className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="john@asoose.com"
                                    value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">Temp Password</label>
                            <input required type="password" className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="********" minLength={8}
                                value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} />
                        </div>
                        <div className="space-y-2 pt-2">
                            <label className="text-xs text-gray-400">Assign Role</label>
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                                {ROLES.map((role) => (
                                    <div key={role.value} onClick={() => setNewAdmin({...newAdmin, role: role.value})}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${newAdmin.role === role.value ? 'bg-blue-600/10 border-blue-500' : 'bg-[#0F172A] border-gray-700'}`}>
                                        <div>
                                            <p className={`text-sm font-bold ${newAdmin.role === role.value ? 'text-blue-400' : 'text-white'}`}>{role.label}</p>
                                        </div>
                                        {newAdmin.role === role.value && <CheckCircle className="w-4 h-4 text-blue-500" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-800">
                            <button type="button" onClick={() => setIsTeamModalOpen(false)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold text-sm">Cancel</button>
                            <button type="submit" disabled={isCreatingAdmin} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                                {isCreatingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}