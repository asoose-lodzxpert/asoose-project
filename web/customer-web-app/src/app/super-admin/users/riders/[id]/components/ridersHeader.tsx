import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Ban, MoreHorizontal, ShieldAlert, CheckCircle, Loader2 } from 'lucide-react';
import { Rider } from './types';
import Swal from 'sweetalert2';
import { getSession } from 'next-auth/react';

interface RiderHeaderProps {
  rider: Rider;
  onToggleStatus: () => void;
}

export default function RiderHeader({ rider, onToggleStatus }: RiderHeaderProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  //  KILL SWITCH (Ban/Suspend)
  const handleKillSwitch = async () => {
    const { value: formValues } = await Swal.fire({
      title: '🚨 EMERGENCY KILL SWITCH',
      html: `
        <div class="text-left text-sm text-gray-300 mb-4">
          This action will immediately <b>block access</b> and <b>revoke sessions</b>.
        </div>
        <div class="mb-3 text-left">
            <label class="text-xs font-bold text-gray-400 uppercase">Action</label>
            <select id="swal-action" class="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white mt-1">
            <option value="SUSPEND">Suspend (Temporary)</option>
            <option value="BAN">Ban (Permanent)</option>
            </select>
        </div>
        <div class="text-left">
            <label class="text-xs font-bold text-gray-400 uppercase">Reason</label>
            <input id="swal-reason" class="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white mt-1" placeholder="Required for audit logs..." />
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

        const res = await fetch(`${API_URL}/super-admin/riders/${rider.id}/kill-switch`, {
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
          text: `Rider has been ${formValues.action}ED.`,
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

  // 🟢 REVERSE KILL SWITCH (Reactivate)
  const handleReactivate = async () => {
    const result = await Swal.fire({
      title: 'Reactivate Rider?',
      text: "This will restore access and allow the rider to go online.",
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

        const res = await fetch(`${API_URL}/super-admin/riders/${rider.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'ACTIVE' }) // Restore to ACTIVE
        });

        if (!res.ok) throw new Error('Failed to reactivate');

        Swal.fire({
          title: 'Restored',
          text: 'Rider account is now ACTIVE.',
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

  const isBannedOrSuspended = ['BANNED', 'SUSPENDED'].includes(rider.status);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <Link href="/super-admin/users/riders" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-1">
          <ArrowLeft className="w-4 h-4" /> Back to Riders
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          {rider.name} 
          <span className={`text-sm px-3 py-1 rounded-full border ${
            rider.status === 'ONLINE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
            rider.status === 'SUSPENDED' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
            rider.status === 'BANNED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
            'bg-gray-500/10 text-gray-400 border-gray-500/20'
          }`}>
            {rider.status}
          </span>
        </h1>
      </div>
      
      <div className="flex gap-3">
        <button className="px-3 md:px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 flex items-center gap-2 transition-colors text-sm">
          <ShieldCheck className="w-4 h-4" /> 
          <span className="hidden md:inline">Verify Documents</span>
        </button>
        
        {/* ACTION BUTTONS */}
        {isBannedOrSuspended ? (
            // ✅ SHOW REACTIVATE BUTTON
            <button 
                onClick={handleReactivate}
                disabled={isProcessing}
                className="px-3 md:px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-2 transition-colors text-sm font-bold shadow-lg shadow-green-900/20 disabled:opacity-50"
            >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4" />}
                <span className="hidden md:inline">Reactivate Account</span>
            </button>
        ) : (
            // ✅ SHOW KILL SWITCH
            <button 
                onClick={handleKillSwitch}
                disabled={isProcessing}
                className="px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm font-bold shadow-lg shadow-red-900/20 disabled:opacity-50"
            >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <ShieldAlert className="w-4 h-4" />}
                <span className="hidden md:inline">Kill Switch</span>
            </button>
        )}

        <button className="p-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}