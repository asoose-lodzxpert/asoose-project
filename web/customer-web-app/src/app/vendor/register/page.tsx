"use client";

import React, { useState } from "react";
import { SignupData } from "@/types/vendor-signup";
import { BUSINESS_TYPES, EMPLOYEE_RANGES } from "@/constants/vendor-signup";
import { Loader2, CheckCircle2, AlertCircle, Upload, MapPin, Clock, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { ApiService } from "@/services/api.service";
import { useRouter } from "next/navigation";

// --- Components for steps will be defined here or imported ---

import Step1 from "./Step1";
import Step2 from "./Step2";
import Step3 from "./Step3";
import Step4 from "./Step4";

const ProgressBar = ({ step }: { step: number }) => (
  <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-8">
    <div 
      className="h-full bg-yellow-500 transition-all duration-500 ease-out" 
      style={{ width: `${(step / 4) * 100}%` }}
    />
  </div>
);

export default function VendorRegistrationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [data, setData] = useState<SignupData>({
    step1: {
      businessName: "",
      businessEmail: "",
      businessEmailVerified: false,
      otpCode: "",
      otpSent: false,
      countryCode: "+234",
      phoneNumber: "",
      businessType: "",
      employees: "",
      password: "",
    },
    step2: {},
    step3: {
      storeName: "",
      storeDescription: "",
      openHours: {
        monday: { open: "08:00", close: "18:00", closed: false, is24Hours: false },
        tuesday: { open: "08:00", close: "18:00", closed: false, is24Hours: false },
        wednesday: { open: "08:00", close: "18:00", closed: false, is24Hours: false },
        thursday: { open: "08:00", close: "18:00", closed: false, is24Hours: false },
        friday: { open: "08:00", close: "18:00", closed: false, is24Hours: false },
        saturday: { open: "08:00", close: "18:00", closed: false, is24Hours: false },
        sunday: { open: "08:00", close: "18:00", closed: false, is24Hours: false },
      },
    },
    acceptedTerms: false,
  });

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!data.step1.businessEmailVerified) {
          toast.error("Please verify your email first.");
          return false;
        }
        if (!data.step1.businessName || !data.step1.phoneNumber || !data.step1.businessType || !data.step1.employees || !data.step1.password) {
          toast.error("Please fill all required fields.");
          return false;
        }
        return true;
      case 2:
        if (!data.step2.businessRegCertFile || !data.step2.taxIdDocFile || !data.step2.proofOfAddressFile) {
          toast.error("Please upload all required documents.");
          return false;
        }
        return true;
      case 3:
        if (!data.step3.storeName || !data.step3.storeDescription || !data.step3.storeLogoFile || !data.step3.storeBannerFile || !data.step3.location) {
          toast.error("Please complete your store setup.");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const mapBusinessTypeToBackend = (t: string) => {
    return t.toUpperCase().replace(/\s+/g, "_").replace(/&/g, "AND");
  };

  const handleFinalSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", data.step1.businessName);
      formData.append("email", data.step1.businessEmail);
      formData.append("countryCode", data.step1.countryCode);
      formData.append("phone", data.step1.phoneNumber);
      formData.append("password", data.step1.password || "");
      formData.append("businessType", mapBusinessTypeToBackend(data.step1.businessType));
      formData.append("employees", data.step1.employees);
      
      if (data.step2.businessRegCertFile) formData.append("businessRegCert", data.step2.businessRegCertFile);
      if (data.step2.taxIdDocFile) formData.append("taxIdDoc", data.step2.taxIdDocFile);
      if (data.step2.proofOfAddressFile) formData.append("proofOfAddress", data.step2.proofOfAddressFile);
      
      formData.append("storeName", data.step3.storeName);
      formData.append("storeDescription", data.step3.storeDescription);
      if (data.step3.storeLogoFile) formData.append("storeLogo", data.step3.storeLogoFile);
      if (data.step3.storeBannerFile) formData.append("storeBanner", data.step3.storeBannerFile);
      
      formData.append("location", JSON.stringify(data.step3.location));
      formData.append("openHours", JSON.stringify(data.step3.openHours));

      await ApiService.postFormData("/auth/vendor/register", formData);
      
      setShowSuccessModal(true);
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAttempt = () => {
    if (!data.acceptedTerms) {
      toast.error("You must accept the terms and conditions.");
      return;
    }
    setShowConfirmModal(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black tracking-tight mb-2">Vendor Onboarding</h1>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Join our network of elite vendors</p>
        </div>

        <ProgressBar step={step} />

        <div className="bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">Step {step} of 4</span>
             </div>

             {/* Step Content */}
             <div className="min-h-[400px]">
                {step === 1 && (
                  <Step1 
                    data={data.step1} 
                    onChange={(keyOrObj: any, val?: any) => {
                      if (typeof keyOrObj === 'string') {
                        setData(prev => ({...prev, step1: {...prev.step1, [keyOrObj]: val}}));
                      } else {
                        setData(prev => ({...prev, step1: {...prev.step1, ...keyOrObj}}));
                      }
                    }} 
                  />
                )}
                {step === 2 && (
                  <Step2 
                    data={data.step2} 
                    onChange={(keyOrObj: any, val?: any) => {
                      if (typeof keyOrObj === 'string') {
                        setData(prev => ({...prev, step2: {...prev.step2, [keyOrObj]: val}}));
                      } else {
                        setData(prev => ({...prev, step2: {...prev.step2, ...keyOrObj}}));
                      }
                    }} 
                  />
                )}
                {step === 3 && (
                  <Step3 
                    data={data.step3} 
                    onChange={(keyOrObj: any, val?: any) => {
                      if (typeof keyOrObj === 'string') {
                        setData(prev => ({...prev, step3: {...prev.step3, [keyOrObj]: val}}));
                      } else {
                        setData(prev => ({...prev, step3: {...prev.step3, ...keyOrObj}}));
                      }
                    }} 
                  />
                )}
                {step === 4 && <Step4 data={data} onAcceptTerms={(val) => setData(prev => ({...prev, acceptedTerms: val}))} />}
             </div>

             {/* Navigation */}
             <div className="mt-12 flex items-center justify-between gap-4 border-t border-gray-200 dark:border-white/10 pt-8">
                {step > 1 ? (
                  <button 
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-3.5 border border-gray-200 dark:border-white/10 rounded-2xl hover:bg-white dark:hover:bg-white/5 transition-all font-bold text-sm disabled:opacity-50"
                  >
                    <ArrowLeft size={18} /> Back
                  </button>
                ) : (
                  <div /> 
                )}
                <button 
                  onClick={step < 4 ? handleNext : handleSubmitAttempt}
                  disabled={isSubmitting}
                  className={`flex-1 md:flex-none md:min-w-[200px] flex items-center justify-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3.5 rounded-2xl transition-all font-black text-sm shadow-xl shadow-yellow-500/20 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>{step < 4 ? "Continue" : "Submit Application"}</span>
                      {step < 4 && <ArrowRight size={18} />}
                    </>
                  )}
                </button>
             </div>
        </div>
        
        <p className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
          Need help? <a href="mailto:support@asoose.com" className="text-yellow-500 hover:underline">Contact our support team</a>
        </p>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowConfirmModal(false)} />
             <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 md:p-10 max-w-lg w-full relative z-10 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
                <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-6">
                   <AlertCircle size={32} className="text-yellow-500" />
                </div>
                <h3 className="text-2xl font-black mb-3">Ready to Submit?</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-8">
                   Please ensure all information and documents provided are accurate. Our team will review your application within 24-48 hours.
                </p>
                <div className="flex gap-4">
                   <button 
                     onClick={() => setShowConfirmModal(false)}
                     className="flex-1 px-6 py-4 border border-gray-200 dark:border-white/10 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                   >
                     Review Again
                   </button>
                   <button 
                     onClick={handleFinalSubmit}
                     className="flex-1 px-6 py-4 bg-yellow-500 hover:bg-yellow-400 text-black rounded-2xl font-black shadow-lg shadow-yellow-500/20 transition-all"
                   >
                     Yes, Submit
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500" />
             <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-[3rem] p-10 md:p-16 max-w-xl w-full relative z-10 shadow-2xl text-center animate-in zoom-in-95 fade-in duration-500">
                <div className="w-24 h-24 bg-green-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
                   <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/40">
                      <CheckCircle2 size={40} className="text-white" />
                   </div>
                </div>
                <h3 className="text-4xl font-black mb-4 tracking-tighter">Application Received!</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-10">
                   Thank you for choosing ASOOSE. Your application has been successfully submitted and is now under review. We'll notify you via email once your store is ready.
                </p>
                <button 
                  onClick={() => router.push("/sign-in?vendor_onboarding=success")}
                  className="w-full px-8 py-5 bg-green-500 hover:bg-green-400 text-white rounded-[1.5rem] font-black shadow-2xl shadow-green-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Continue to Login
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
