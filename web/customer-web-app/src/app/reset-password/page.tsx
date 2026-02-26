"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  CheckCircle,
  EyeOff,
  ArrowLeft,
  Eye,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiService } from "../../services/api.service";

const ResetPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"otp" | "password">("otp");
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const [formData, setFormData] = useState({
    otp: "",
    password: "",
    confirmPassword: "",
  });

  // Auto-focus on OTP input
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get email from sessionStorage
    const storedEmail = sessionStorage.getItem("resetEmail");
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // Redirect to forgot-password if no email is stored
      router.push("/forgot-password");
    }
  }, [router]);

  useEffect(() => {
    if (step === "otp" && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Session expired. Please start over.");
      return;
    }

    if (!formData.otp || formData.otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await ApiService.post("/auth/user/verify-otp", {
        email,
        otp: formData.otp,
      });

      setOtpVerified(true);
      setStep("password");
    } catch (err: any) {
      setError(err.message || "Invalid or expired OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !otpVerified) {
      setError("Please verify OTP first");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await ApiService.post("/auth/user/reset-password", {
        email,
        token: formData.otp,
        newPassword: formData.password,
      });

      setSuccess(true);
      // Clear stored email
      sessionStorage.removeItem("resetEmail");

      // Redirect to sign-in after 2 seconds
      setTimeout(() => {
        router.push("/sign-in");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError("");

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

      const res = await fetch(`${API_URL}/auth/user/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to resend OTP");
      }

      // Reset OTP field and start cooldown
      setFormData({ ...formData, otp: "" });
      setResendCooldown(60); // 60 seconds cooldown
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4 transition-colors">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">
              Password reset
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your password has been successfully reset
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/sign-in"
              className="block w-full bg-yellow-500 text-black py-3 rounded-xl hover:bg-yellow-400 transition-all text-sm font-bold text-center shadow-lg shadow-yellow-500/20"
            >
              Continue to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Verify OTP
  if (step === "otp") {
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
              Verify OTP
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter the 6-digit code sent to{" "}
              {email && <span className="font-bold">{email}</span>}
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
                value={formData.otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setFormData({ ...formData, otp: value });
                }}
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 transition-all text-center tracking-widest text-lg font-mono"
                disabled={isLoading}
              />
            </div>

            <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl transition-colors">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                Didn't receive the code?
              </p>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading}
                className="text-xs font-medium text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend OTP"}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !formData.otp || formData.otp.length !== 6}
              className="w-full bg-yellow-500 text-black py-3 rounded-xl hover:bg-yellow-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold shadow-lg shadow-yellow-500/20 active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Verify OTP"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Step 2: Set new password
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      <div className="w-full max-w-sm">
        <button
          onClick={() => setStep("otp")}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-500 mb-8 transition-colors font-medium"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">
            Set new password
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose a strong password for your account
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/20">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl transition-colors">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
              Password must contain:
            </p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li
                className={`flex items-center gap-2 ${formData.password.length >= 8 ? "text-green-600 dark:text-green-400 font-bold" : ""}`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${formData.password.length >= 8 ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                ></div>
                At least 8 characters
              </li>
              <li
                className={`flex items-center gap-2 ${/[A-Z]/.test(formData.password) ? "text-green-600 dark:text-green-400 font-bold" : ""}`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(formData.password) ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                ></div>
                One uppercase letter
              </li>
              <li
                className={`flex items-center gap-2 ${/[0-9]/.test(formData.password) ? "text-green-600 dark:text-green-400 font-bold" : ""}`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(formData.password) ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                ></div>
                One number
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={
              isLoading ||
              !formData.password ||
              !formData.confirmPassword ||
              formData.password !== formData.confirmPassword
            }
            className="w-full bg-yellow-500 text-black py-3 rounded-xl hover:bg-yellow-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold shadow-lg shadow-yellow-500/20 active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Resetting password...
              </span>
            ) : (
              "Reset password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
