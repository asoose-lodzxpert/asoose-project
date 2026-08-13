"use client";

import React, { useState } from "react";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiService } from "@/services/api.service";

const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Email is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      await ApiService.post<Record<string, never>>("/auth/forgot-password", {
        email: normalizedEmail,
      });

      // Store email in sessionStorage for reset-password page
      sessionStorage.setItem("resetEmail", normalizedEmail);
      sessionStorage.removeItem("resetCode");

      // Show success state
      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4 transition-colors">
              <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">
              Check your email
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We've sent a 6-digit OTP to{" "}
              <span className="font-bold text-gray-900 dark:text-white">
                {email.trim().toLowerCase()}
              </span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl transition-colors">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Didn't receive the OTP?
              </p>
              <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>Check your spam or junk folder</li>
                <li>Make sure the email address is correct</li>
                <li>The OTP is valid for 10 minutes</li>
              </ul>
            </div>

            <button
              onClick={() => {
                router.push("/verify-otp");
              }}
              className="w-full bg-yellow-500 text-black py-3 rounded-xl hover:bg-yellow-400 transition-all text-sm font-bold shadow-lg shadow-yellow-500/20 active:scale-[0.98]"
            >
              Continue to verify OTP
            </button>

            <button
              onClick={() => {
                setEmailSent(false);
                setEmail("");
                setError("");
              }}
              className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors py-2"
            >
              Use a different email
            </button>

            <Link
              href="/sign-in"
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      <div className="w-full max-w-sm">
        <Link
          href="/sign-in"
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-500 mb-8 transition-colors font-medium"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">
            Forgot password?
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No worries, we'll send you a one-time password
          </p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/20">
              {error}
            </div>
          )}

          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-yellow-500 text-black py-3 rounded-xl hover:bg-yellow-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold shadow-lg shadow-yellow-500/20 active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending OTP...
              </span>
            ) : (
              "Send OTP"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
