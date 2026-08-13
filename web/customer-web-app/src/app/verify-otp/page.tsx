"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiService } from "../../services/api.service";

const VerifyOtpPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Restore email from sessionStorage; guard against direct-nav with no email
  useEffect(() => {
    const stored = sessionStorage.getItem("resetEmail");
    if (!stored) {
      router.replace("/forgot-password");
      return;
    }
    setEmail(stored);
  }, [router]);

  // Auto-focus OTP input once email is ready
  useEffect(() => {
    if (email && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [email]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Session expired. Please start over.");
      return;
    }

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // The reset endpoint validates the code together with the new password.
      sessionStorage.setItem("resetCode", otp);

      router.push("/reset-password");
    } catch (err: any) {
      setError(err.message || "We couldn't continue. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError("");

    try {
      await ApiService.post<Record<string, never>>("/auth/forgot-password", {
        email,
      });

      setOtp("");
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      <div className="w-full max-w-sm">
        <Link
          href="/forgot-password"
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-500 mb-8 transition-colors font-medium"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">
            Enter reset code
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter the 6-digit code sent to{" "}
            {email && (
              <span className="font-bold text-gray-900 dark:text-white">
                {email}
              </span>
            )}
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/20">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              OTP Code
            </label>
            <input
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(value);
                if (error) setError("");
              }}
              maxLength={6}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 transition-all text-center tracking-widest text-lg font-mono"
              disabled={isLoading}
              autoComplete="one-time-code"
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl transition-colors">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
              Didn't receive the code?
            </p>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || isResending || isLoading}
              className="text-xs font-medium text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <RefreshCw
                size={12}
                className={isResending ? "animate-spin" : ""}
              />
              {isResending
                ? "Sending..."
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend OTP"}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full bg-yellow-500 text-black py-3 rounded-xl hover:bg-yellow-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold shadow-lg shadow-yellow-500/20 active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Continuing...
              </span>
            ) : (
              "Continue"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
