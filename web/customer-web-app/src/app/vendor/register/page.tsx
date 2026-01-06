'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';
// import { createClient } from '@/utils/supabase/client';
import { Store, MapPin, Clock, Loader2, ArrowRight, Building2, Utensils, Pill, ShoppingBasket, Mail, Lock, User } from 'lucide-react';
import { toast } from 'react-toastify';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function VendorRegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Account Fields (Only used if not logged in)
    email: '',
    password: '',
    ownerName: '',
    
    // Store Fields
    name: '',
    address: '',
    type: 'RESTAURANT',
    deliveryTime: '30-45 min',
  });

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let token = "";

      // STEP 1: Handle Auth (If not logged in)
      if (!isAuthenticated) {
         // 1. Sign Up
         const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: { full_name: formData.ownerName, role: 'VENDOR' } // Tag them as vendor immediately
            }
         });

         if (authError) throw new Error(authError.message);
         if (!authData.session) throw new Error("Please check your email to confirm account before creating a store.");
         
         token = authData.session.access_token;
      } else {
         // Get existing token
         const { data: { session } } = await supabase.auth.getSession();
         token = session?.access_token || "";
      }

      // STEP 2: Create Store
      const res = await fetch(`${API_URL}/vendor/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
           name: formData.name,
           address: formData.address,
           type: formData.type,
           deliveryTime: formData.deliveryTime
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create store');

      toast.success("Welcome Partner! Redirecting to Dashboard...");
      router.push('/admin/dashboard');

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-[#151515] p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-white/5 relative overflow-hidden">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Become a Partner</h1>
          <p className="text-gray-500 mt-2">Join thousands of businesses on Asoosee</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* SECTION 1: ACCOUNT DETAILS (Only show if NOT logged in) */}
          {!isAuthenticated && (
            <div className="space-y-4 p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
               <h3 className="text-sm font-bold uppercase text-gray-400">1. Account Details</h3>
               
               <div className="grid md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-gray-500 ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input required type="text" placeholder="John Doe" className="w-full h-10 pl-9 pr-4 rounded-lg bg-white dark:bg-black/20 border-2 border-transparent focus:border-yellow-500 outline-none transition-all font-bold text-sm"
                        value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input required type="email" placeholder="partner@business.com" className="w-full h-10 pl-9 pr-4 rounded-lg bg-white dark:bg-black/20 border-2 border-transparent focus:border-yellow-500 outline-none transition-all font-bold text-sm"
                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                 </div>
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-500 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input required type="password" placeholder="Create a strong password" className="w-full h-10 pl-9 pr-4 rounded-lg bg-white dark:bg-black/20 border-2 border-transparent focus:border-yellow-500 outline-none transition-all font-bold text-sm"
                      value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
               </div>
               <div className="text-xs text-gray-400 flex gap-1">
                 Already have an account? <Link href="/sign-in" className="text-yellow-600 font-bold hover:underline">Log in first</Link>
               </div>
            </div>
          )}

          {/* SECTION 2: BUSINESS DETAILS */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase text-gray-400">
               {isAuthenticated ? '1. Business Details' : '2. Business Details'}
            </h3>
            
            {/* Store Name & Address */}
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 ml-1">Business Name</label>
                  <input required type="text" placeholder="e.g. Tasty Bites" className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-yellow-500 outline-none transition-all font-bold"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 ml-1">Address</label>
                  <input required type="text" placeholder="Street, City" className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-white/5 border-2 border-transparent focus:border-yellow-500 outline-none transition-all font-bold"
                    value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
            </div>

            {/* Store Type */}
            <div>
               <label className="text-xs font-bold text-gray-500 ml-1">Business Type</label>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                  {['RESTAURANT', 'GROCERY', 'PHARMACY', 'MART'].map(type => (
                    <button key={type} type="button" onClick={() => setFormData({...formData, type})}
                      className={`text-xs font-bold p-3 rounded-lg border-2 transition-all ${formData.type === type ? 'border-yellow-500 bg-yellow-50 text-black' : 'border-transparent bg-gray-50 text-gray-500'}`}>
                      {type}
                    </button>
                  ))}
               </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full h-14 bg-yellow-500 text-black rounded-xl font-black text-lg shadow-xl shadow-yellow-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : <>Complete Registration <ArrowRight className="w-5 h-5" /></>}
          </button>

        </form>
      </div>
    </div>
  );
}