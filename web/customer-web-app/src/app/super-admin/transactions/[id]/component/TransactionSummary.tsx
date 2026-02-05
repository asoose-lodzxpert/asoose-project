import {
  Banknote,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { CopyButton } from "./CopyButton";
import { TransactionDetail } from "../types";
import { Currency } from "@/app/main/components/Currency";

export const TransactionSummary = ({ txn }: { txn: TransactionDetail }) => {
  const isCredit =
    txn.type.includes("Payment") ||
    txn.type.includes("Earning") ||
    txn.type.includes("Top-up") ||
    txn.type.includes("Received");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Success":
        return "bg-green-500/20 text-green-500 border-green-500/20";
      case "Failed":
        return "bg-red-500/20 text-red-500 border-red-500/20";
      case "Processing":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-gray-500/20 text-gray-500 border-gray-500/20";
    }
  };

  const StatusIcon =
    txn.status === "Success"
      ? CheckCircle
      : txn.status === "Failed"
        ? XCircle
        : txn.status === "Processing"
          ? Clock
          : AlertCircle;

  return (
    <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-4 md:p-6 overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4 w-full min-w-0">
          {/* Icon Box */}
          <div
            className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex-shrink-0 flex items-center justify-center ${isCredit ? "bg-green-500/10" : "bg-orange-500/10"}`}
          >
            <div
              className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${isCredit ? "bg-green-500/20" : "bg-orange-500/20"}`}
            >
              {isCredit ? (
                <Banknote className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
              ) : (
                <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
              )}
            </div>
          </div>

          {/* Amount & Desc */}
          <div className="min-w-0 flex-1">
            <h2 className="text-white text-2xl md:text-3xl font-bold flex items-center gap-1 truncate">
              <span>{isCredit ? "+" : "-"}</span>
              <Currency amount={Math.abs(txn.amount)} />
            </h2>
            <p className="text-gray-400 text-xs md:text-sm truncate">
              {txn.description}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`flex-shrink-0 px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-2 ${getStatusColor(txn.status)} border self-start md:self-auto`}
        >
          <StatusIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="font-semibold text-xs md:text-sm">{txn.status}</span>
        </div>
      </div>

      {/* Error Message */}
      {txn.paymentInfo?.failureReason && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-xs md:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1 break-words">
              {txn.paymentInfo.failureReason}
            </span>
          </p>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 border-t border-gray-800 pt-6">
        <div className="space-y-1">
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
            Transaction Type
          </p>
          <p className="text-white font-medium text-sm truncate">{txn.type}</p>
        </div>
        <div className="space-y-1">
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
            Date & Time
          </p>
          <p className="text-white font-medium text-sm truncate">
            {new Date(txn.date).toLocaleString()}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
            Payment Method
          </p>
          <p className="text-white font-medium text-sm flex items-center gap-2 truncate">
            <CreditCard className="w-3.5 h-3.5 text-gray-400" /> {txn.method}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
            Reference
          </p>
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-white font-mono text-xs md:text-sm truncate bg-gray-900 px-2 py-1 rounded border border-gray-800">
              {txn.reference}
            </p>
            <CopyButton text={txn.reference} label="Reference" />
          </div>
        </div>
      </div>
    </div>
  );
};
