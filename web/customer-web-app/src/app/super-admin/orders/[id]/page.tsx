'use client';

import React from 'react';
import { 
  ArrowLeft, Printer, XCircle, Phone, MapPin, User, Mail, 
  AlertTriangle, Package, Loader2, Store, CreditCard, 
  Check, Copy, ExternalLink, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import useSWR from 'swr'; 
import { fetcher } from '../../hooks/useSuperAdminFetch';
import OrderActionsPanel from './component/OrderActionsPanel';
import { Currency } from '@/app/main/components/Currency';
// --- Types ---
interface OrderDetail {
  id: string;
  serviceType: string;
  status: string;
  amount: number;
  updatedAt: string;
  isLate: boolean;
  dispute?: { id: string; reason: string };
  customer: { name: string; email: string; phone: string; address: string };
  vendor: { name: string; address: string; ownerName: string; ownerPhone: string };
  rider?: { name: string; phone: string; vehicle: string };
  items: { name: string; quantity: number; price: number; options?: string; image?: string }[];
  payment: { status: string; method: string; total: number };
  logs: { date: string; user: string; action: string }[];
}

// --- Status Stepper Component ---
const OrderStepper = ({ status }: { status: string }) => {
    const STEPS = ['PLACED', 'PREPARING', 'READY', 'PICKED_UP', 'DELIVERED'];
    
    let activeIndex = STEPS.indexOf('PLACED');
    if (status === 'PENDING') activeIndex = 0;
    if (status === 'PREPARING') activeIndex = 1;
    if (status === 'READY') activeIndex = 2;
    if (status === 'DISPATCHED') activeIndex = 3;
    if (status === 'DELIVERED' || status === 'COMPLETED') activeIndex = 4;
    
    if (['CANCELLED', 'REJECTED'].includes(status)) {
        return (
            <div className="w-full bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-center gap-2 text-red-400 font-bold mb-6">
                <XCircle className="w-5 h-5" /> Order was {status.toLowerCase()}
            </div>
        );
    }

    return (
        <div className="w-full bg-[#1E293B] p-6 rounded-xl border border-gray-800 mb-6 overflow-x-auto print:hidden">
            <div className="flex items-center justify-between min-w-[600px]">
                {STEPS.map((step, i) => (
                    <div key={step} className="flex flex-col items-center relative z-10 w-full group">
                        {/* Connector Line */}
                        {i !== 0 && (
                            <div className={`absolute top-3 -left-1/2 w-full h-1 transition-colors duration-500 ${
                                i <= activeIndex ? 'bg-green-500' : 'bg-gray-700'
                            }`} />
                        )}
                        
                        {/* Circle */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-300 ${
                            i <= activeIndex 
                                ? 'bg-green-500 border-green-500 text-black shadow-lg shadow-green-500/20 scale-110' 
                                : 'bg-[#1E293B] border-gray-600 text-gray-500'
                        }`}>
                            {i < activeIndex ? <Check className="w-3 h-3" /> : i + 1}
                        </div>
                        
                        {/* Label */}
                        <span className={`text-[10px] uppercase mt-3 font-bold tracking-wider transition-colors ${
                            i <= activeIndex ? 'text-white' : 'text-gray-500'
                        }`}>
                            {step.replace('_', ' ')}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function OrderDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  // ===========================================================================
  //  ✅ SWR DATA FETCHING
  // ===========================================================================

  const { data: order, error, isLoading, mutate } = useSWR<OrderDetail>(
    id ? `/super-admin/orders/${id}` : null, // Ensure this matches your API route path
    fetcher,
    {
        refreshInterval: 10000, 
        shouldRetryOnError: false
    }
  );

  // --- Handlers ---
  const handleCancel = async () => {
     // Legacy Handler (You can likely remove this now since the ActionPanel handles it better)
     // But keeping it for the top button if you want quick access
  };

  const copyId = () => {
      if(order?.id) {
          navigator.clipboard.writeText(order.id);
          toast.success('Copied!');
      }
  }

  // --- Render ---

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0F172A]"><Loader2 className="w-8 h-8 text-yellow-500 animate-spin" /></div>;
  if (error || !order) return <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white">Order Not Found</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20 print:p-0 print:bg-white">
      
      {/* 1. Header (Hidden on Print) */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 print:hidden">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <Link href="/super-admin/orders" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Orders
             </Link>
           </div>
           
           <div className="flex items-center gap-3 group">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Order #{order.id}
              </h1>
              <button onClick={copyId} className="p-1.5 rounded bg-gray-800 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                  <Copy className="w-4 h-4" />
              </button>
              <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase border ${
                 order.status === 'DELIVERED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
              }`}>
                  {order.status}
              </span>
           </div>
           <p className="text-gray-400 text-sm mt-1">Placed on {new Date(order.updatedAt).toLocaleString()}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
           <button 
             onClick={() => mutate()} 
             className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
             title="Refresh"
           >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
           </button>
           <button onClick={() => window.print()} className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 text-sm font-bold flex items-center gap-2 transition-colors">
             <Printer className="w-4 h-4" /> Print
           </button>
        </div>
      </div>

      {/* 2. Visual Progress Stepper */}
      <OrderStepper status={order.status} />

      {/* 3. Dispute Banner */}
      {order.dispute && (
        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex flex-col md:flex-row items-center gap-4 text-red-200 print:border-red-500 print:text-black">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg text-white">
                 <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                 <h3 className="font-bold text-white">Active Dispute Reported</h3>
                 <p className="text-sm text-red-300">Reason: <span className="font-medium text-white">{order.dispute.reason}</span></p>
              </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
              <Link 
                href={`/super-admin/disputes/${order.dispute.id}`} 
                className="px-4 py-2 border border-red-500/30 hover:bg-red-500/10 text-white text-sm font-bold rounded-lg flex items-center gap-2"
              >
                View Ticket <ExternalLink className="w-3 h-3" />
              </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Order Content */}
        <div className="lg:col-span-2 space-y-6">
            
           {/* Items List */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 print:border-gray-200 print:bg-white print:text-black shadow-sm">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 print:text-black">
                <Package className="w-5 h-5 text-yellow-500" /> Items Ordered
              </h2>
              <div className="divide-y divide-gray-800 print:divide-gray-200">
                {order.items.map((item, i) => (
                  <div key={i} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          {/* Thumbnail Placeholder */}
                          <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 overflow-hidden print:hidden">
                             {item.image ? (
                               // eslint-disable-next-line @next/next/no-img-element
                               <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                             ) : (
                               <Package className="w-6 h-6 opacity-50" />
                             )}
                          </div>
                          
                          <div>
                             <div className="flex items-center gap-2">
                                <span className="text-white text-sm font-bold print:text-black">{item.name}</span>
                                <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded print:hidden">x{item.quantity}</span>
                             </div>
                             {item.options && <p className="text-gray-500 text-xs print:text-gray-600 mt-0.5">{item.options}</p>}
                          </div>
                      </div>
                      <div className="text-right">
                          <p className="text-white font-mono font-medium print:text-black"><Currency amount={item.price * item.quantity} /></p>
                          <p className="text-gray-600 text-xs"><Currency amount={item.price} />/ea</p>
                      </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-800 mt-4 pt-4 flex justify-between items-center print:border-gray-200">
                  <span className="text-gray-400 print:text-gray-600">Total Amount</span>
                  <span className="text-xl font-bold text-white print:text-black"><Currency amount={order.amount}/></span>
              </div>
           </div>

           {/* Customer Card */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 print:border-gray-200 print:bg-white print:text-black shadow-sm">
              <h2 className="text-lg font-bold text-white mb-4 print:text-black">Customer Details</h2>
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><User className="w-4 h-4" /></div>
                    <span className="text-white font-medium print:text-black">{order.customer.name}</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><Phone className="w-4 h-4" /></div>
                    <a href={`tel:${order.customer.phone}`} className="text-blue-400 hover:text-blue-300 hover:underline print:text-blue-600 font-mono">
                        {order.customer.phone}
                    </a>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><MapPin className="w-4 h-4" /></div>
                    <span className="text-gray-300 text-sm print:text-black mt-1.5">{order.customer.address}</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-lg text-gray-400"><Mail className="w-4 h-4" /></div>
                    <a href={`mailto:${order.customer.email}`} className="text-gray-300 hover:text-white text-sm">
                        {order.customer.email}
                    </a>
                 </div>
              </div>
           </div>

           {/* Audit Logs */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 print:hidden shadow-sm">
              <h2 className="text-lg font-bold text-white mb-4">Activity Log</h2>
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                 {order.logs.length > 0 ? order.logs.map((log, i) => (
                    <div key={i} className="flex gap-3 group">
                       <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-gray-600 group-hover:bg-yellow-500 transition-colors mt-1.5"></div>
                          {i !== order.logs.length - 1 && <div className="w-px h-full bg-gray-800 my-1"></div>}
                       </div>
                       <div>
                          <p className="text-xs text-gray-300 font-bold">{log.action}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                             {new Date(log.date).toLocaleString()} • <span className="text-gray-400">{log.user}</span>
                          </p>
                       </div>
                    </div>
                 )) : <p className="text-gray-500 text-sm italic">No logs recorded.</p>}
              </div>
           </div>

        </div>

        {/* RIGHT COLUMN: Operational Info */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
            
           {/* Vendor Info */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                 <Store className="w-5 h-5 text-purple-500" /> Store Info
              </h2>
              <div className="space-y-3 mb-6">
                 <div className="flex justify-between text-sm border-b border-gray-800 pb-2">
                    <span className="text-gray-500">Name</span> 
                    <span className="text-white font-bold">{order.vendor.name}</span>
                 </div>
                 <div className="flex justify-between text-sm border-b border-gray-800 pb-2">
                    <span className="text-gray-500">Owner</span> 
                    <span className="text-white">{order.vendor.ownerName}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Contact</span> 
                    <span className="text-blue-400 font-mono">{order.vendor.ownerPhone}</span>
                 </div>
              </div>
              <a 
                href={`tel:${order.vendor.ownerPhone}`} 
                className="w-full py-2.5 border border-purple-500/30 text-purple-400 bg-purple-500/5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-purple-500/10 transition-colors"
              >
                 <Phone className="w-4 h-4" /> Call Vendor
              </a>
           </div>

           {/* Rider Card */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-white mb-4">Delivery Partner</h2>
              {order.rider ? (
                 <>
                    <div className="space-y-4 mb-6">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-white">
                             {order.rider.name.charAt(0)}
                          </div>
                          <div>
                             <p className="text-white font-bold text-sm">{order.rider.name}</p>
                             <p className="text-gray-400 text-xs">{order.rider.vehicle}</p>
                          </div>
                       </div>
                       <a href={`tel:${order.rider.phone}`} className="flex items-center gap-2 text-blue-400 text-sm hover:underline">
                          <Phone className="w-3 h-3" /> {order.rider.phone}
                       </a>
                    </div>
                    <button className="w-full py-2.5 border border-gray-600 rounded-xl text-gray-300 text-sm font-bold hover:bg-gray-700 transition-colors">
                       Reassign Rider
                    </button>
                 </>
              ) : (
                 <div className="text-center py-6 border border-dashed border-gray-700 rounded-xl bg-gray-800/20">
                    <p className="text-gray-400 text-sm mb-3">No Rider Assigned</p>
                    <button className="px-4 py-2 bg-yellow-500 text-black text-sm font-bold rounded-lg hover:bg-yellow-400 transition-colors">
                       Assign Manually
                    </button>
                 </div>
              )}
           </div>

           {/* Payment Status */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-sm">
               <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                 <CreditCard className="w-5 h-5 text-gray-400" /> Payment
               </h2>
               <div className="flex justify-between items-center mb-3">
              <span className="text-gray-400 text-sm">Status</span>
<span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
    // ✅ FIX: Use optional chaining (?.) to check if payment exists
    order.payment?.status === 'PAID' || order.payment?.status === 'COMPLETED'
        ? 'bg-green-500/20 text-green-500' 
        : 'bg-red-500/20 text-red-500'
}`}>
    {/* ✅ FIX: Add a fallback text if payment is null */}
    {order.payment?.status || 'UNPAID'}
</span>
               </div>
               <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Method</span>
<span className="text-white text-sm uppercase font-mono bg-gray-800 px-2 py-1 rounded">
    {/* ✅ FIX: Add ?. and a fallback */}
    {order.payment?.method || 'N/A'}
</span>
               </div>
           </div>

           {/* ✅ NEW: OPERATIONAL ACTIONS (THE RED BUTTON) */}
           <OrderActionsPanel 
              orderId={order.id}
              currentStatus={order.status}
              onUpdate={() => mutate()} // Forces the whole page to refresh after an action
           />

        </div>
      </div>
    </div>
  );
}