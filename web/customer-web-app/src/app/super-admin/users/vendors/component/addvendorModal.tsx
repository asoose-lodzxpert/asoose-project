'use client';

import React, { useState } from 'react';
import { X, Loader2, Store, Mail, Tag, Phone, MapPin, Info, Send } from 'lucide-react';
import Swal from 'sweetalert2';

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorAdded: () => void;
}

export default function AddVendorModal({ isOpen, onClose, onVendorAdded }: AddVendorModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'General Goods',
    phone: '',
    address: '',
  });

  // Prevent scrolling on the body beneath the modal when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // API Call
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'Pending', 
          verification: 'Pending', 
          rating: null,
          orders: 0
        }),
      });

      if (!response.ok) throw new Error('Failed to add vendor');

      Swal.fire({
        icon: 'success',
        title: 'Invitation Sent',
        text: `An invite link has been sent to ${formData.email}.`,
        background: '#1E293B',
        color: '#fff',
        confirmButtonColor: '#eab308',
        timer: 2000,
        showConfirmButton: false
      });

      onVendorAdded();
      onClose();
      setFormData({ name: '', email: '', category: 'General Goods', phone: '', address: '' });

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to create vendor. Please try again.',
        background: '#1E293B',
        color: '#fff'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Backdrop with padding to ensure modal doesn't touch screen edges on mobile
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      
      {/* Modal Container:
         - max-h-[90vh]: Ensures it doesn't exceed 90% of viewport height.
         - overflow-y-auto: Allows internal scrolling if content is too tall.
         - rounded-xl md:rounded-2xl: Slightly tighter corners on mobile.
      */}
      <div className="bg-[#1E293B] border border-gray-800 w-full max-w-lg rounded-xl md:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto relative">
        
        {/* Header - Sticky on mobile scrolling */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-800 sticky top-0 bg-[#1E293B] z-10">
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-yellow-500" />
            Invite New Vendor
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Alert - Responsive padding */}
        <div className="px-4 pt-4 md:px-6 md:pt-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs md:text-sm text-blue-200">
              <p className="font-bold mb-1">Onboarding Flow</p>
              The vendor will receive an email to <strong>set their password</strong> and complete their business profile upon login.
            </div>
          </div>
        </div>

        {/* Form - Responsive padding */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase">Vendor Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <Store className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input 
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Joe's Pizza"
                className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
          </div>

          {/* Email & Phone Grid (already responsive) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Email <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input 
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="vendor@email.com"
                  className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input 
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase">Category <span className="text-red-500">*</span></label>
            <div className="relative">
              <Tag className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <select 
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors appearance-none"
              >
                <option value="General Goods">General Goods</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Grocery">Grocery</option>
                <option value="Pharmacy">Pharmacy</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input 
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main St, City, Country"
                className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex gap-3 sticky bottom-0 bg-[#1E293B] pb-1 md:pb-0">
             {/* Added sticky bottom here too just in case, though usually outer container scroll handle it */}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-800 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors text-sm flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Invite
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}