"use client";

import React, { useState, useEffect } from "react";
import { SignupStep1Data } from "@/types/vendor-signup";
import { BUSINESS_TYPES, EMPLOYEE_RANGES, COUNTRY_CODES } from "@/constants/vendor-signup";
import { Loader2, Mail, Phone, Lock, User, Briefcase, Users, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { toast } from "react-toastify";

interface Step1Props {
  data: SignupStep1Data;
  onChange: (keyOrObj: keyof SignupStep1Data | Partial<SignupStep1Data>, val?: any) => void;
}

export default function Step1({ data, onChange }: Step1Props) {
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  // Password validation state
  const [validations, setValidations] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false,
  });

  useEffect(() => {
    const password = data.password || "";
    setValidations({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*()_+\-[\]{};':"\\|,.<>/?]/.test(password),
    });
  }, [data.password]);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  const handleSendOtp = async () => {
    if (!data.businessEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.businessEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSendingOtp(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
      const res = await fetch(`${API_URL}/auth/vendor/send-signup-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.businessEmail }),
      });

      if (!res.ok) throw new Error("Failed to send OTP");

      onChange("otpSent", true);
      setOtpTimer(60);
      toast.success("OTP sent to your email!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!data.otpCode || data.otpCode.length < 4) {
      toast.error("Please enter a valid OTP.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
      const res = await fetch(`${API_URL}/auth/vendor/verify-signup-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.businessEmail, otp: data.otpCode }),
      });

      if (!res.ok) throw new Error("Invalid OTP");

      onChange("businessEmailVerified", true);
      toast.success("Email verified successfully!");
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const inputCls = (disabled = false) => `
    w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl 
    focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all text-sm
    ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-white/5" : ""}
  `;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-black tracking-tight">Business Information</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Verifying your business credentials</p>
      </div>

      {/* Email & OTP Section */}
      <div className="space-y-4 p-6 bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2">
            <Mail size={16} className="text-yellow-500" />
            Business Email
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={data.businessEmail}
              onChange={(e) => onChange("businessEmail", e.target.value)}
              disabled={data.businessEmailVerified || isSendingOtp}
              placeholder="name@business.com"
              className={inputCls(data.businessEmailVerified)}
            />
            {!data.businessEmailVerified && (
              <button
                onClick={handleSendOtp}
                disabled={isSendingOtp || !data.businessEmail || otpTimer > 0}
                className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold disabled:opacity-50 whitespace-nowrap"
              >
                {isSendingOtp ? <Loader2 className="animate-spin" size={16} /> : otpTimer > 0 ? `Resend (${otpTimer}s)` : data.otpSent ? "Resend" : "Send OTP"}
              </button>
            )}
            {data.businessEmailVerified && (
              <div className="flex items-center justify-center px-4 bg-green-500/10 text-green-500 rounded-xl">
                <CheckCircle2 size={20} />
              </div>
            )}
          </div>
        </div>

        {data.otpSent && !data.businessEmailVerified && (
          <div className="space-y-2 animate-in zoom-in-95 duration-300">
            <label className="text-sm font-bold">Verification Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.otpCode}
                onChange={(e) => onChange("otpCode", e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className={inputCls()}
              />
              <button
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp || !data.otpCode}
                className="px-8 py-2 bg-yellow-500 text-black rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {isVerifyingOtp ? <Loader2 className="animate-spin" size={16} /> : "Verify"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Form Fields (Disabled until email verified) */}
      <div className={`space-y-6 transition-opacity duration-300 ${!data.businessEmailVerified ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Briefcase size={16} className="text-yellow-500" />
              Business Name
            </label>
            <input
              type="text"
              value={data.businessName}
              onChange={(e) => onChange("businessName", e.target.value)}
              placeholder="Registered Business Name"
              className={inputCls()}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Phone size={16} className="text-yellow-500" />
              Phone Number
            </label>
            <div className="flex gap-2">
              <select
                value={data.countryCode}
                onChange={(e) => onChange("countryCode", e.target.value)}
                className="px-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none"
              >
                {COUNTRY_CODES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="tel"
                value={data.phoneNumber}
                onChange={(e) => onChange("phoneNumber", e.target.value)}
                placeholder="801 234 5678"
                className={inputCls()}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Users size={16} className="text-yellow-500" />
              Staff Size
            </label>
            <div className="relative">
              <select
                value={data.employees}
                onChange={(e) => onChange("employees", e.target.value)}
                className={inputCls() + " appearance-none pr-10"}
              >
                <option value="">Select range</option>
                {EMPLOYEE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Briefcase size={16} className="text-yellow-500" />
              Business Type
            </label>
            <div className="relative">
              <select
                value={data.businessType}
                onChange={(e) => onChange("businessType", e.target.value)}
                className={inputCls() + " appearance-none pr-10"}
              >
                <option value="">Select type</option>
                {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2">
              <Lock size={16} className="text-yellow-500" />
              Create Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={data.password}
              onChange={(e) => onChange("password", e.target.value)}
              placeholder="Min 8 characters, uppercase, number"
              className={inputCls()}
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries({
              "8+ chars": validations.length,
              "Uppercase": validations.uppercase,
              "Lowercase": validations.lowercase,
              "Number": validations.number,
              "Symbol": validations.symbol
            }).map(([label, valid]) => (
              <div key={label} className={`flex items-center gap-2 p-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${valid ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/5 border-red-500/10 text-red-400"}`}>
                {valid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
