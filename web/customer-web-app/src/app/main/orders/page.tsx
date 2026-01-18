export const dynamic = 'force-dynamic';

import ReportDisputeModal from "./component/reportDisputeModal";
export default function OrdersComponentPage() {
  return <ReportDisputeModal isOpen={false} onClose={() => {}} orderId="" />;
}