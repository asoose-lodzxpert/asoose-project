import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Navigation, Calendar, Trash2 } from "lucide-react";
import { DataTable } from "@/app/super-admin/component/datatable";
import { Ride, Payout } from "./types";
import { getPayoutStatusColor } from "./columns";
import {
  createRideColumns,
  createPayoutColumns,
  getRideStatusIcon,
  getRideStatusColor,
} from "./columns";
interface RiderTabsProps {
  rides: Ride[];
  payouts: Payout[];
  onDeleteRide: (id: string) => void;
  onProcessPayout: (id: string) => void;
  onRetryPayout: (id: string) => void;
  onDeletePayout: (id: string) => void;
}

export default function RiderTabs({
  rides,
  payouts,
  onDeleteRide,
  onProcessPayout,
  onRetryPayout,
  onDeletePayout,
}: RiderTabsProps) {
  const [activeTab, setActiveTab] = useState("Ride History");
  const [rideRowSelection, setRideRowSelection] = useState({});
  const [payoutRowSelection, setPayoutRowSelection] = useState({});

  // Generate columns with the passed handlers
  const rideColumns = useMemo(
    () => createRideColumns({ onDelete: onDeleteRide }),
    [onDeleteRide],
  );
  const payoutColumns = useMemo(
    () =>
      createPayoutColumns({
        onProcess: onProcessPayout,
        onRetry: onRetryPayout,
        onDelete: onDeletePayout,
      }),
    [onProcessPayout, onRetryPayout, onDeletePayout],
  );

  // Mobile Card Renderers
  const renderRideMobileCard = (ride: Ride) => (
    <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 mb-3">
      <div className="flex justify-between items-start mb-3">
        <span className="text-yellow-500 font-bold text-sm">{ride.id}</span>
        <div className="flex items-center gap-1">
          {getRideStatusIcon(ride.status)}
          <span
            className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getRideStatusColor(ride.status)}`}
          >
            {ride.status}
          </span>
        </div>
      </div>
      <div className="space-y-2 text-sm text-gray-300">
        <div>
          <Calendar className="w-4 h-4 inline mr-2" />
          {ride.date}
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-800">
          <span className="font-bold text-white">{ride.fare}</span>
          <button
            onClick={() => onDeleteRide(ride.id)}
            className="text-red-400 text-xs flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>
    </div>
  );

  const renderPayoutMobileCard = (payout: Payout) => (
    <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 mb-3">
      <div className="flex justify-between items-start mb-3">
        <span className="text-yellow-500 font-mono font-bold text-sm">
          {payout.id}
        </span>
        <span
          className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getPayoutStatusColor(payout.status)}`}
        >
          {payout.status}
        </span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="font-bold text-white">{payout.amount}</span>
        <button
          onClick={() => onDeletePayout(payout.id)}
          className="text-red-400 text-xs"
        >
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-2xl overflow-hidden flex-1 min-h-0">
      <div className="flex border-b border-gray-800 overflow-x-auto">
        {["Ride History", "Payouts", "Reviews", "Vehicle Logs"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 md:px-6 py-3 md:py-4 text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "text-yellow-500 border-b-2 border-yellow-500 bg-[#0F172A]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-6 flex-1 min-h-0">
        {activeTab === "Ride History" && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">Recent Rides</h3>
              <Link
                href="/super-admin/rides"
                className="text-xs text-yellow-500 hover:text-yellow-400"
              >
                View All Rides
              </Link>
            </div>
            <div className="flex-1 min-h-0">
              <DataTable
                data={rides}
                columns={rideColumns}
                rowSelection={rideRowSelection}
                onRowSelectionChange={setRideRowSelection}
                pageSize={5}
                renderMobileCard={renderRideMobileCard}
              />
            </div>
          </div>
        )}

        {activeTab === "Payouts" && (
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <DataTable
                data={payouts}
                columns={payoutColumns}
                rowSelection={payoutRowSelection}
                onRowSelectionChange={setPayoutRowSelection}
                pageSize={5}
                renderMobileCard={renderPayoutMobileCard}
              />
            </div>
          </div>
        )}

        {(activeTab === "Reviews" || activeTab === "Vehicle Logs") && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Navigation className="w-10 h-10 mb-4 opacity-20" />
            <p>No data available for {activeTab}</p>
          </div>
        )}
      </div>
    </div>
  );
}
