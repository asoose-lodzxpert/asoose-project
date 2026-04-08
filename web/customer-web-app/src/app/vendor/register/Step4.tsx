"use client";

import React from "react";
import { SignupData } from "@/types/vendor-signup";
import { CheckCircle2, User, Briefcase, FileText, Store as StoreIcon, Clock, MapPin } from "lucide-react";

interface Step4Props {
  data: SignupData;
  onAcceptTerms: (val: boolean) => void;
}

export default function Step4({ data, onAcceptTerms }: Step4Props) {
  const SummarySection = ({ title, icon: Icon, children }: any) => (
    <div className="space-y-4 p-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} className="text-yellow-500" />
        <h3 className="text-sm font-black uppercase tracking-wider">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );

  const DataItem = ({ label, value }: { label: string, value: any }) => (
    <div className="space-y-1">
      <p className="text-[10px] uppercase font-bold text-gray-500">{label}</p>
      <p className="text-sm font-medium truncate">{value || <span className="text-red-400 italic">Not provided</span>}</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-black tracking-tight">Review & Submit</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Please verify all information before submitting your application</p>
      </div>

      <div className="space-y-6">
        <SummarySection title="Business Profile" icon={Briefcase}>
          <DataItem label="Business Name" value={data.step1.businessName} />
          <DataItem label="Business Email" value={data.step1.businessEmail} />
          <DataItem label="Phone Number" value={`${data.step1.countryCode} ${data.step1.phoneNumber}`} />
          <DataItem label="Business Type" value={data.step1.businessType} />
          <DataItem label="Staff Size" value={data.step1.employees} />
        </SummarySection>

        <SummarySection title="Documents" icon={FileText}>
          <DataItem label="Registration Cert" value={data.step2.businessRegCertName} />
          <DataItem label="Tax ID Document" value={data.step2.taxIdDocName} />
          <DataItem label="Proof of Address" value={data.step2.proofOfAddressName} />
        </SummarySection>

        <SummarySection title="Store Details" icon={StoreIcon}>
          <DataItem label="Store Name" value={data.step3.storeName} />
          <DataItem label="Address" value={data.step3.address} />
          <div className="col-span-full">
            <DataItem label="Description" value={data.step3.storeDescription} />
          </div>
          <div className="flex gap-6 col-span-full">
             <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-gray-500">Logo</p>
                {data.step3.storeLogoUri && <img src={data.step3.storeLogoUri} className="w-20 h-20 rounded-xl object-cover border border-gray-200 dark:border-white/10 shadow-sm" />}
             </div>
             <div className="space-y-2 flex-1">
                <p className="text-[10px] uppercase font-bold text-gray-500">Banner</p>
                {data.step3.storeBannerUri && <img src={data.step3.storeBannerUri} className="h-20 w-full rounded-xl object-cover border border-gray-200 dark:border-white/10 shadow-sm" />}
             </div>
          </div>
        </SummarySection>

        <div className="p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
           <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-1">
                <input 
                  type="checkbox" 
                  checked={data.acceptedTerms}
                  onChange={(e) => onAcceptTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 transition-all cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold group-hover:text-yellow-600 transition-colors">I accept the Terms and Conditions</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  By submitting this application, I certify that all information provided is accurate and I agree to ASOOSE's Vendor Agreement and Privacy Policy.
                </p>
              </div>
           </label>
        </div>
      </div>
    </div>
  );
}
