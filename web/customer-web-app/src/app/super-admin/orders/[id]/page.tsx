'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Printer, RotateCcw, XCircle, Phone, 
  MapPin, User, Clock, CheckCircle, Mail, AlertTriangle 
} from 'lucide-react';
import Link from 'next/link';
import OrderDetailsPageSkeleton from './component/skeleton';
import { OrderDetail,MOCK_ORDER_DETAIL } from './component/data';
import Swal from 'sweetalert2';

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const orderId = params.id || 'ORD-001';
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Data Fetching ---
  useEffect(() => {

    const fetchOrderDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (response.ok) {
          const data = await response.json();
          setOrder(data);
        } else {
          console.warn("API unavailable, using mock data");
          setOrder(MOCK_ORDER_DETAIL);
        }
      } catch (error) {
        console.error("Failed to fetch order details:", error);
        setOrder(MOCK_ORDER_DETAIL);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  // --- Handlers ---
  const handlePrint = () => {
    window.print();
  };

  const handleRefund = async () => {
    const result = await Swal.fire({
      title: 'Refund Order?',
      text: "This will initiate a refund to the customer's original payment method.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#eab308', // Yellow for refund warning
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Refund',
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      // API call logic here
      Swal.fire({
        title: 'Refund Initiated',
        text: 'The refund request has been processed.',
        icon: 'success',
        background: '#1E293B',
        color: '#fff',
        confirmButtonColor: '#eab308'
      });
    }
  };

  const handleCancelOrder = async () => {
    const result = await Swal.fire({
      title: 'Cancel Order?',
      text: "Are you sure you want to cancel this order? This action cannot be undone.",
      icon: 'error', // Red icon for destructive action
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Cancel Order',
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      // API call logic here
      Swal.fire({
        title: 'Order Cancelled',
        text: 'The order status has been updated to Cancelled.',
        icon: 'success',
        background: '#1E293B',
        color: '#fff',
        confirmButtonColor: '#eab308'
      });
    }
  };

  if (isLoading || !order) {
    return <OrderDetailsPageSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      
      {/* 1. Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold text-white">Order Details: {order.id}</h1>
           <p className="text-gray-400 text-sm mt-1">Service Type: <span className="text-white font-bold">{order.serviceType}</span></p>
        </div>
        
        <div className="flex flex-wrap gap-3">
           <Link href="/super-admin/orders" className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to List
           </Link>
           <button onClick={handlePrint} className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm">
              <Printer className="w-4 h-4" /> Print Receipt
           </button>
           <button onClick={handleRefund} className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm">
              <RotateCcw className="w-4 h-4" /> Refund Order
           </button>
           <button onClick={handleCancelOrder} className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Cancel Order
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (Timeline & Customer) */}
        <div className="lg:col-span-2 space-y-6">
           
           {/* Timeline Card */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-lg font-bold text-white">Order Status & Timeline</h2>
                 <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded text-xs font-bold uppercase">
                    {order.status}
                 </span>
              </div>
              <p className="text-gray-400 text-xs mb-8">
                 Last Update: <span className="text-white">{order.updatedAt}</span> • Estimated Delivery: <span className="text-white">{order.estimatedDelivery}</span>
              </p>

              {/* Stepper / Timeline */}
              <div className="space-y-6 relative border-l-2 border-gray-700 ml-3 pl-8">
                 {order.timeline.map((step, i) => (
                    <div key={i} className="relative">
                       <div className={`absolute -left-[41px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-[#1E293B] z-10 
                          ${step.active ? 'border-cyan-500 text-cyan-500' : step.done ? 'border-gray-500 text-gray-500' : 'border-gray-700'}`}>
                          {step.active ? <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" /> : step.done && <div className="w-2 h-2 bg-gray-500 rounded-full" />}
                       </div>
                       
                       <h3 className={`font-bold text-sm ${step.active ? 'text-cyan-400' : 'text-gray-200'}`}>{step.title}</h3>
                       <p className="text-xs text-gray-500">{step.date} {step.desc && `— ${step.desc}`}</p>
                    </div>
                 ))}
              </div>

              <div className="mt-8 flex justify-end">
                 <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white font-bold transition-colors">
                    Override Status
                 </button>
              </div>
           </div>

           {/* Customer Details Card */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-6">Customer Details</h2>
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-500" /> 
                    <span className="text-yellow-500 font-bold">{order.customer.name}</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-500" /> 
                    <span className="text-gray-300 text-sm">{order.customer.email}</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-500" /> 
                    <span className="text-gray-300 text-sm">{order.customer.phone}</span>
                 </div>
                 <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-500 mt-1" /> 
                    <div>
                       <p className="text-gray-300 text-sm">{order.customer.address}</p>
                       {order.customer.instructions && (
                         <p className="text-gray-500 text-xs italic mt-1">Instructions: {order.customer.instructions}</p>
                       )}
                    </div>
                 </div>
              </div>
              <div className="mt-6">
                 <button className="px-4 py-2 border border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 rounded-lg text-sm font-bold flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Contact Customer
                 </button>
              </div>
           </div>

        </div>

        {/* RIGHT COLUMN (Rider, Payment, Logs) */}
        <div className="lg:col-span-1 space-y-6">
           
           {/* Rider Details */}
           {order.rider ? (
             <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Rider Details</h2>
                <div className="space-y-3 mb-6">
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-bold">Name:</span>
                      <Link href={`/super-admin/users/riders/${order.rider.id}`} className="text-yellow-500 font-bold underline">{order.rider.name}</Link>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-bold">Status:</span>
                      <span className="text-white">{order.rider.status}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-bold">Phone:</span>
                      <span className="text-white">{order.rider.phone}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-bold">Vehicle:</span>
                      <span className="text-white">{order.rider.vehicle}</span>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <button className="py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 text-xs font-bold flex items-center justify-center gap-1">
                      <Phone className="w-3 h-3" /> Contact
                   </button>
                   <button className="py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 text-xs font-bold flex items-center justify-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Reassign
                   </button>
                </div>
             </div>
           ) : (
             <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <AlertTriangle className="w-10 h-10 text-yellow-500 mb-3" />
                <h2 className="text-lg font-bold text-white">No Rider Assigned</h2>
                <p className="text-gray-400 text-sm mb-4">This order is still pending assignment.</p>
                <button className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-sm">
                   Assign Rider
                </button>
             </div>
           )}

           {/* Payment Details */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Payment Details</h2>
              <div className="space-y-3 mb-6 border-b border-gray-800 pb-6">
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-bold">Method:</span>
                    <span className="text-white">{order.payment.method}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-bold">Trans. ID:</span>
                    <span className="text-white font-mono">{order.payment.transactionId}</span>
                 </div>
                 <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500 font-bold">Status:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${order.payment.status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {order.payment.status}
                    </span>
                 </div>
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between text-gray-400 text-sm">
                    <span>Subtotal:</span> <span>${order.payment.subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-gray-400 text-sm">
                    <span>Delivery Fee:</span> <span>${order.payment.deliveryFee.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-gray-400 text-sm">
                    <span>Service Fee:</span> <span>${order.payment.serviceFee.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-gray-400 text-sm">
                    <span>Tax:</span> <span>${order.payment.tax.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-gray-700 mt-2">
                    <span>Total Paid:</span> <span>${order.payment.total.toFixed(2)}</span>
                 </div>
              </div>
           </div>

           {/* Admin Action Log */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Admin Action Log</h2>
              <div className="space-y-4">
                 {order.logs.map((log, i) => (
                   <div key={i} className="border-l-2 border-gray-700 pl-3">
                      <p className="text-xs text-gray-400 font-bold">{log.date} <span className="text-gray-500 font-normal">by {log.user}</span></p>
                      <p className="text-xs text-gray-300 mt-1">{log.action}</p>
                   </div>
                 ))}
              </div>
           </div>

        </div>

      </div>

    </div>
  );
}