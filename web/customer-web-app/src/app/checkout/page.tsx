'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { createClient } from '../../../utils/supabase/client';
import { ChevronLeft, MapPin, CreditCard, Banknote, Clock, ChevronRight, ShieldCheck, Minus, Plus, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import Link from 'next/link';

const SAVED_ADDRESSES = [
  { id: '1', label: 'Home', address: '12 Ikorodu Road, Lagos', isDefault: true },
  { id: '2', label: 'Office', address: '5 Victoria Island, Lagos', isDefault: false },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();
  const cartItems = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.getTotalPrice());
  const clearCart = useCartStore((state) => state.clearCart);
  
  const addItem = useCartStore((state) => state.addItem);
  const decreaseItem = useCartStore((state) => state.decreaseItem);
  const removeItem = useCartStore((state) => state.removeItem);

  const [selectedAddress, setSelectedAddress] = useState(SAVED_ADDRESSES[0]);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const DELIVERY_FEE = 1500;
  const SERVICE_FEE = Math.round(cartTotal * 0.05);
  const GRAND_TOTAL = cartTotal + DELIVERY_FEE + SERVICE_FEE;

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && cartItems.length === 0) {
      router.push('/');
    }
  }, [mounted, cartItems, router]);

 const handlePlaceOrder = async () => {
    // 1. Validations
    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }

    // 2. Get Token (Assuming you have a way to get it, or use Supabase client)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        toast.error("Please log in to order");
        router.push('/sign-in');
        return;
    }

    setIsProcessing(true);

    try {
      // 3. Prepare Payload
      const payload = {
        addressId: selectedAddress.id,
        restaurantId: cartItems[0].restaurantId, // Assuming all items are from same rest
        items: cartItems.map(item => ({
            id: item.id,
            quantity: item.quantity
        }))
      };

      // 4. Call API
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Order failed');

      // 5. Success!
      await Swal.fire({
        icon: 'success',
        title: 'Order Placed!',
        text: `Your order has been sent to the kitchen.`,
        confirmButtonColor: '#EAB308',
        confirmButtonText: 'Track Order',
        background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
        color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
      });

      clearCart();
      router.push('/profile'); // Redirect to Profile to see the new order

    } catch (error) {
      console.error(error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans pb-32 lg:pb-10">
      
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5 px-4 h-16 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg">Checkout</h1>
        <div className="w-8" />
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">

          <section className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-yellow-500" /> Delivery Address
              </h2>
              <button className="text-yellow-600 dark:text-yellow-500 text-sm font-bold">Change</button>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between group cursor-pointer hover:border-yellow-500/50 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900 dark:text-white">{selectedAddress.label}</span>
                  <span className="text-[10px] bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-md text-gray-600 dark:text-gray-300">Default</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedAddress.address}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          </section>

          <section className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-yellow-500" /> Payment Method
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div onClick={() => setPaymentMethod('card')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${paymentMethod === 'card' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' : 'border-transparent bg-gray-50 dark:bg-white/5 hover:bg-gray-100'}`}>
                <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-sm text-yellow-600"><CreditCard className="w-5 h-5" /></div>
                <div><p className="font-bold text-sm">Pay with Card</p><p className="text-xs text-gray-500">Paystack / Flutterwave</p></div>
                {paymentMethod === 'card' && <div className="ml-auto w-4 h-4 rounded-full bg-yellow-500 border-2 border-white" />}
              </div>
              <div onClick={() => setPaymentMethod('cash')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${paymentMethod === 'cash' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' : 'border-transparent bg-gray-50 dark:bg-white/5 hover:bg-gray-100'}`}>
                <div className="w-10 h-10 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-sm text-green-600"><Banknote className="w-5 h-5" /></div>
                <div><p className="font-bold text-sm">Pay on Delivery</p><p className="text-xs text-gray-500">Cash or Transfer</p></div>
                {paymentMethod === 'cash' && <div className="ml-auto w-4 h-4 rounded-full bg-yellow-500 border-2 border-white" />}
              </div>
            </div>
          </section>

          {/* C. ORDER ITEMS - MODIFIED SECTION */}
          <section className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
             <div className="flex items-center justify-between mb-4">
               <h2 className="font-bold text-lg">Order Summary</h2>
               <Link href="/" className="text-sm font-bold text-yellow-600 dark:text-yellow-500">Add Items</Link>
             </div>

             <div className="space-y-6">
               {cartItems.map((item) => (
                 <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       
                       {/* QTY CONTROLS */}
                       <div className="flex flex-col items-center bg-gray-50 dark:bg-white/5 rounded-lg">
                          <button 
                            onClick={() => addItem({...item, quantity: 1})}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-t-lg transition-colors text-green-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold py-0.5 px-2">{item.quantity}</span>
                          <button 
                            onClick={() => decreaseItem(item.id)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-b-lg transition-colors text-red-500"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                       </div>

                       <div>
                         <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.name}</p>
                         <p className="text-xs text-gray-500">₦{item.price.toLocaleString()} / unit</p>
                       </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <p className="text-sm font-black">₦{(item.price * item.quantity).toLocaleString()}</p>
                        <button 
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                 </div>
               ))}
             </div>

             {/* Note Input */}
             <div className="mt-6 pt-6 border-t border-dashed border-gray-200 dark:border-white/10">
               <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Delivery Note</label>
               <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Call me when you get to the gate..."
                  className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-yellow-500 outline-none resize-none h-20"
               />
             </div>
          </section>

        </div>

        <div className="lg:col-span-1">
           <div className="sticky top-24 space-y-4">
             <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                <h3 className="font-bold text-lg mb-6">Payment Details</h3>
                <div className="space-y-3 text-sm">
                   <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal</span><span>₦{cartTotal.toLocaleString()}</span></div>
                   <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Delivery Fee</span><span>₦{DELIVERY_FEE.toLocaleString()}</span></div>
                   <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Service Fee</span><span>₦{SERVICE_FEE.toLocaleString()}</span></div>
                </div>
                <div className="my-4 border-t border-dashed border-gray-200 dark:border-white/10" />
                <div className="flex justify-between items-center mb-6">
                   <span className="font-black text-lg">Total</span>
                   <span className="font-black text-2xl text-yellow-600 dark:text-yellow-500">₦{GRAND_TOTAL.toLocaleString()}</span>
                </div>
                <button onClick={handlePlaceOrder} disabled={isProcessing} className="hidden lg:flex w-full bg-yellow-500 text-black py-4 rounded-xl font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-all items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                  {isProcessing ? <>Processing...</> : <>Place Order <ShieldCheck className="w-5 h-5 opacity-50" /></>}
                </button>
             </div>
             <div className="flex items-center justify-center gap-2 text-xs text-gray-400"><ShieldCheck className="w-4 h-4" /> Secure SSL Encryption</div>
           </div>
        </div>

      </main>

      {/* MOBILE FIXED FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#151515] border-t border-gray-100 dark:border-white/5 p-4 z-40 lg:hidden">
         <div className="flex items-center justify-between mb-3 px-1">
             <div className="text-xs text-gray-500">Total Amount</div>
             <div className="font-black text-xl">₦{GRAND_TOTAL.toLocaleString()}</div>
         </div>
         <button onClick={handlePlaceOrder} disabled={isProcessing} className="w-full bg-yellow-500 text-black py-4 rounded-xl font-bold shadow-lg shadow-yellow-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-70">
            {isProcessing ? 'Processing...' : 'Place Order'}
         </button>
      </div>

    </div>
  );
}