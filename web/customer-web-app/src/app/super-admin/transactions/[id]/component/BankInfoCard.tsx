import React from "react";
import { Building2 } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { SectionCard } from "./SectionCard";
import { TransactionDetail } from "../types";

export const BankInfoCard = ({
  info,
}: {
  info: NonNullable<TransactionDetail["bankInfo"]>;
}) => {
  return (
    <SectionCard
      title="Bank Account"
      icon={Building2}
      iconColorClass="bg-green-500/20 text-green-500"
    >
      <div className="space-y-4">
        <div>
          <p className="text-gray-400 text-xs mb-2">Bank Name</p>
          <p className="text-white font-medium">{info.bankName}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-2">Account Number</p>
          <div className="flex items-center justify-between">
            <p className="text-white font-mono">
              **** {info.accountNumber.slice(-4)}
            </p>
            <CopyButton text={info.accountNumber} label="Account Number" />
          </div>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-2">Account Name</p>
          <p className="text-white">{info.accountName}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-2">Currency</p>
          <p className="text-white font-medium">{info.currency}</p>
        </div>
      </div>
    </SectionCard>
  );
};
