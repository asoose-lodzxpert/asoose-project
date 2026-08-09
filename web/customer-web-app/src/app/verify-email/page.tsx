"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, RefreshCw, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ApiService } from "../../services/api.service";

const VerifyEmailPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const email = session?.user?.email ?? "";

  // Not signed in — nothing to verify. Registration/login always establishes
  // a session first, so landing here without one means direct navigation.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/sign-up");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [status]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await ApiService.post("/auth/verify-email", { code });
      router.push("/main/store");
    } catch (err: any) {
      setError(err?.message || "Invalid or expired code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending || !email) return;

    setIsResending(true);
    setError("");
    setResent(false);

    try {
      await ApiService.post("/auth/resend-verification", { email });
      setCode("");
      setResent(true);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || "Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-500/10">
            <MailCheck className="h-6 w-6 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">
            Verify your email
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

        <form onSubmit={handleVerify} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/20">
              {error}
            </div>
          )}

          {resent && !error && (
            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/10 dark:text-green-400 dark:border-green-900/20">
              A new code has been sent.
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Verification Code
            </label>
            <input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(value);
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
              onClick={handleResend}
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
                  : "Resend code"}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full bg-yellow-500 text-black py-3 rounded-xl hover:bg-yellow-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold shadow-lg shadow-yellow-500/20 active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </span>
            ) : (
              "Verify email"
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push("/main/store")}
            className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-1"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
