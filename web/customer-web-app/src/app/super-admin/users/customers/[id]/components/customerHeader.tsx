import React from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, CheckCircle, Ban, ShieldAlert, Loader2 } from 'lucide-react';
import { CustomerProfile } from '../types';
import Swal from 'sweetalert2';
import { getSession } from 'next-auth/react';

interface CustomerHeaderProps {
  customer: CustomerProfile;
  onToggleStatus: () => void;
  onSendMessage: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({ 
  customer, 
  onToggleStatus, 
  onSendMessage 
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);

  //  KILL SWITCH
  const handleKillSwitch = async () => {
    const { value: formValues } = await Swal.fire({
      title: '🚨 CUSTOMER KILL SWITCH',
      html: `
        <div class="text-left text-sm text-gray-300 mb-4">
          This will <b>block this customer</b> from placing orders or logging in.
        </div>
        <div class="mb-3 text-left">
            <label class="text-xs font-bold text-gray-400 uppercase">Action</label>
            <select id="swal-action" class="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white mt-1">
            <option value="SUSPEND">Suspend</option>
            <option value="BAN">Ban</option>
            </select>
        </div>
        <div class="text-left">
            <label class="text-xs font-bold text-gray-400 uppercase">Reason</label>
            <input id="swal-reason" class="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white mt-1" placeholder="Required..." />
        </div>
      `,
      icon: 'warning',
      background: '#1E293B',
      color: '#fff',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'EXECUTE',
      preConfirm: () => {
        const action = (document.getElementById('swal-action') as HTMLSelectElement).value;
        const reason = (document.getElementById('swal-reason') as HTMLInputElement).value;
        if (!reason) Swal.showValidationMessage('Reason is required');
        return { action, reason };
      }
    });

    if (formValues) {
      setIsProcessing(true);
      try {
        const session = await getSession();
        const token = (session as any)?.accessToken;
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        const res = await fetch(`${API_URL}/super-admin/customers/${customer.id}/kill-switch`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formValues)
        });

        if (!res.ok) throw new Error('Action failed');

        Swal.fire({
          title: 'Executed',
          text: `Customer has been ${formValues.action}ED.`,
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          timer: 1500, showConfirmButton: false
        }).then(() => window.location.reload());

      } catch (err: any) {
        Swal.fire({ title: 'Error', text: err.message, icon: 'error', background: '#1E293B', color: '#fff' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  //  REACTIVATE
  const handleReactivate = async () => {
    const result = await Swal.fire({
      title: 'Reactivate Customer?',
      text: "This will restore access to the platform.",
      icon: 'question',
      background: '#1E293B',
      color: '#fff',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      confirmButtonText: 'Yes, Reactivate'
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        const session = await getSession();
        const token = (session as any)?.accessToken;
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        const res = await fetch(`${API_URL}/super-admin/customers/${customer.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'ACTIVE' })
        });

        if (!res.ok) throw new Error('Failed to reactivate');

        Swal.fire({
          title: 'Restored',
          text: 'Customer account is now ACTIVE.',
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          timer: 1500, showConfirmButton: false
        }).then(() => window.location.reload());

      } catch (err: any) {
        Swal.fire({ title: 'Error', text: err.message, icon: 'error', background: '#1E293B', color: '#fff' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const isBannedOrSuspended = ['BANNED', 'SUSPENDED'].includes(customer.status);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <Link href="/super-admin/users/customers" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-1 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Link>
        <div className="flex items-center gap-3">
           <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
              customer.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500 border-green-500/20' : 
              'bg-red-500/20 text-red-500 border-red-500/20'
           }`}>
              {customer.status}
           </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onSendMessage} className="px-4 py-2 bg-[#1E293B] border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 flex items-center gap-2 transition-colors text-sm font-medium">
          <MessageSquare className="w-4 h-4" /> Message
        </button>
        
        {isBannedOrSuspended ? (
             // ✅ SHOW REACTIVATE BUTTON
             <button 
             onClick={handleReactivate}
             disabled={isProcessing}
             className="px-4 py-2 bg-green-600 text-white border border-green-600 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium hover:bg-green-500 disabled:opacity-50"
           >
             {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4" />}
             Reactivate Account
           </button>
        ) : (
            // ✅ SHOW KILL SWITCH
            <button 
                onClick={handleKillSwitch}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-red-900/20 text-sm disabled:opacity-50"
            >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <ShieldAlert className="w-4 h-4" />}
                Kill Switch
            </button>
        )}
      </div>
    </div>
  );
};