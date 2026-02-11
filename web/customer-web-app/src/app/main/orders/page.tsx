"use client";

import React from "react";
import ReportDisputeModal from "./component/reportDisputeModal";

export default function OrdersComponentPage() {
  return (
    <ReportDisputeModal 
      isOpen={false} 
      onClose={() => {}} 
      referenceId=""   // Fixed: Changed from 'orderId' to 'referenceId'
      type="ORDER"     // Fixed: Added required 'type' prop
    />
  );
}