"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, EyeOff, ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiService } from "../../services/api.service";

const ResetPasswordPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState("");
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  // The reset code is collected on the previous screen and validated by the
  // backend together with the new password.
  useEffect(() => {
    const storedCode = sessionStorage.getItem("resetCode");

    if (!storedCode) {
      router.replace("/forgot-password");
      return;
    }

    setCode(storedCode);
  }, [router]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code) {
      setError("Session expired. Please start over.");
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
      await ApiService.post<Record<string, never>>("/auth/reset-password", {
        code,
        password: formData.password,
      });

      // Clear session state
      sessionStorage.removeItem("resetEmail");
      sessionStorage.removeItem("resetCode");

      setSuccess(true);

      // Redirect to sign-in after 2.5 seconds
      setTimeout(() => {
        router.push("/sign-in");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
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
              Your password has been successfully reset. Redirecting you to sign
              in…
            </p>
          </div>

          <Link
            href="/sign-in"
            className="block w-full bg-yellow-500 text-black py-3 rounded-xl hover:bg-yellow-400 transition-all text-sm font-bold text-center shadow-lg shadow-yellow-500/20"
          >
            Continue to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      <div className="w-full max-w-sm">
        <Link
          href="/verify-otp"
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-500 mb-8 transition-colors font-medium"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

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
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (error) setError("");
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                  disabled={isLoading}
                  autoComplete="new-password"
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
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    });
                    if (error) setError("");
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                  disabled={isLoading}
                  autoComplete="new-password"
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

          {/* Live password requirements */}
          <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl transition-colors">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
              Password must contain:
            </p>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              {[
                {
                  label: "At least 8 characters",
                  met: formData.password.length >= 8,
                },
                {
                  label: "One uppercase letter",
                  met: /[A-Z]/.test(formData.password),
                },
                {
                  label: "One number",
                  met: /[0-9]/.test(formData.password),
                },
              ].map(({ label, met }) => (
                <li
                  key={label}
                  className={`flex items-center gap-2 ${met ? "text-green-600 dark:text-green-400 font-bold" : ""}`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${met ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="submit"
            disabled={
              isLoading ||
              !formData.password ||
              !formData.confirmPassword ||
              formData.password !== formData.confirmPassword ||
              formData.password.length < 8
            }
            className="w-full bg-yellow-500 text-black py-3 rounded-xl hover:bg-yellow-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold shadow-lg shadow-yellow-500/20 active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Resetting password…
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
