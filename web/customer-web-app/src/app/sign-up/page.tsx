"use client";

import { EyeOff, Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { trackMetaEvent } from "@/lib/meta-pixel";

// ─── Validation Rules ────────────────────────────────────────────────────────

const PHONE_RE = /^(\+234|0)[789][01]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_STRENGTH_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function splitName(v: string): { firstName: string; lastName: string } {
  const parts = v.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function validateName(v: string): string {
  if (!v.trim()) return "Full name is required";
  const { firstName, lastName } = splitName(v);
  if (firstName.length < 2 || lastName.length < 2)
    return "Enter both your first and last name";
  if (v.trim().length > 100) return "Name is too long";
  return "";
}

function validateEmail(v: string): string {
  if (!v.trim()) return "Email address is required";
  if (!EMAIL_RE.test(v.trim())) return "Enter a valid email address";
  return "";
}

// UI-facing form: accepts either 0-prefixed or +234 input, displayed as typed.
function normalizePhone(v: string) {
  let p = v.replace(/[\s\-]/g, "");
  if (p.startsWith("+234")) p = "0" + p.slice(4);
  else if (p.startsWith("234")) p = "0" + p.slice(3);
  return p;
}

// Backend requires E.164-style international format (no leading 0).
function toApiPhone(v: string) {
  const norm = normalizePhone(v);
  return norm.startsWith("0") ? `+234${norm.slice(1)}` : norm;
}

function validatePhone(v: string): string {
  if (!v.trim()) return "Phone number is required";
  const norm = normalizePhone(v.trim());
  if (!PHONE_RE.test(norm))
    return "Enter a valid Nigerian number (e.g. 08012345678)";
  return "";
}

function validatePassword(v: string): string {
  if (!v) return "Password is required";
  if (v.length < 8) return "Password must be at least 8 characters";
  if (!PASSWORD_STRENGTH_RE.test(v))
    return "Include uppercase, lowercase, and a number";
  return "";
}

function validateConfirm(v: string, password: string): string {
  if (!v) return "Please confirm your password";
  if (v !== password) return "Passwords do not match";
  return "";
}

// ─── Component ────────────────────────────────────────────────────────────────

const SignUpPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState("");
  const router = useRouter();

  const [fields, setFields] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // Per-field error strings; empty string = no error
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // Update a single field value
  const set = (key: keyof typeof fields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  // Validate one field on blur
  const touch = (key: keyof typeof fields) => {
    const errs = { ...errors };
    switch (key) {
      case "name":            errs.name            = validateName(fields.name); break;
      case "email":           errs.email           = validateEmail(fields.email); break;
      case "phone":           errs.phone           = validatePhone(fields.phone); break;
      case "password":        errs.password        = validatePassword(fields.password); break;
      case "confirmPassword": errs.confirmPassword = validateConfirm(fields.confirmPassword, fields.password); break;
    }
    setErrors(errs);
  };

  // Validate everything at submit time; returns true if valid
  const validateAll = (): boolean => {
    const errs = {
      name:            validateName(fields.name),
      email:           validateEmail(fields.email),
      phone:           validatePhone(fields.phone),
      password:        validatePassword(fields.password),
      confirmPassword: validateConfirm(fields.confirmPassword, fields.password),
    };
    setErrors(errs);
    return Object.values(errs).every((e) => e === "");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    if (!validateAll()) return;

    setIsLoading(true);

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

      const { firstName, lastName } = splitName(fields.name);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: fields.email.trim(),
          password: fields.password,
          phone: toApiPhone(fields.phone.trim()),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.message || "Registration failed");

      trackMetaEvent("CompleteRegistration", {
        content_name: "customer_account",
        status: "completed",
      });

      // Auto sign-in after successful registration
      const signInResult = await signIn("credentials", {
        email: fields.email.trim(),
        password: fields.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setApiError(
          "Registration successful but sign-in failed. Please sign in manually.",
        );
        setTimeout(() => router.push("/sign-in"), 2000);
        return;
      }

      // Read the freshly-created session to determine the user's role.
      // In the current flow /auth/user/register always creates a CUSTOMER,
      // but this guard future-proofs the signup flow: if the backend ever
      // assigns an admin role at registration time, the redirect is correct.
      const ADMIN_ROLES = new Set([
        "ADMIN",
        "SUPER_ADMIN",
        "ADMIN_MANAGER",
        "ADMIN_SUPPORT",
        "ADMIN_FINANCE",
      ]);
      const { getSession } = await import("next-auth/react");
      const session = await getSession();
      const role = session?.user?.role as string | undefined;
      // New accounts are never pre-verified — send regular customers to
      // confirm their email (backend already emailed them a code at
      // registration). Verification isn't enforced for login, so this is a
      // nudge, not a gate — the page itself offers a "skip for now" option.
      const destination = role && ADMIN_ROLES.has(role)
        ? "/super-admin/dashboard"
        : "/verify-email";

      router.push(destination);
    } catch (err: any) {
      setApiError(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      // Use /auth/callback so the server reads the session role and routes
      // admins to /super-admin/dashboard and regular users to /main/store.
      await signIn("google", { callbackUrl: "/auth/callback" });
    } catch (err: any) {
      setApiError(err.message || "Google sign-up failed");
      setIsLoading(false);
    }
  };

  // Helper: class for inputs that have an error
  const inputCls = (err: string) =>
    `w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 transition-all ${
      err
        ? "border-red-400 focus:ring-red-400"
        : "border-gray-200 dark:border-white/10 focus:ring-yellow-500"
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 transition-colors duration-300 bg-white dark:bg-[#0a0a0a]">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">
            Create account
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Get started for free
          </p>
        </div>

        <div className="space-y-4">
          {/* API-level error banner */}
          {apiError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/20">
              {apiError}
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogleSignUp}
            type="button"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors bg-white dark:bg-white/5 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
              Continue with Google
            </span>
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-white dark:bg-[#0a0a0a] text-gray-500 font-bold tracking-wider">
                or
              </span>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-3" noValidate>
            {/* Full Name */}
            <div>
              <input
                type="text"
                placeholder="Full Name"
                value={fields.name}
                onChange={(e) => set("name", e.target.value)}
                onBlur={() => touch("name")}
                className={inputCls(errors.name)}
                disabled={isLoading}
                autoComplete="name"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={fields.email}
                onChange={(e) => set("email", e.target.value)}
                onBlur={() => touch("email")}
                className={inputCls(errors.email)}
                disabled={isLoading}
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <input
                type="tel"
                placeholder="Phone Number (e.g. 08012345678)"
                value={fields.phone}
                onChange={(e) => set("phone", e.target.value)}
                onBlur={() => touch("phone")}
                className={inputCls(errors.phone)}
                disabled={isLoading}
                autoComplete="tel"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.phone}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={fields.password}
                  onChange={(e) => {
                    set("password", e.target.value);
                    // Live re-validate confirm if already touched
                    if (errors.confirmPassword)
                      setErrors((prev) => ({
                        ...prev,
                        confirmPassword: validateConfirm(fields.confirmPassword, e.target.value),
                      }));
                  }}
                  onBlur={() => touch("password")}
                  className={inputCls(errors.password)}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.password}
                </p>
              )}

              {/* Strength hint — only shown when no error and value is present */}
              {!errors.password && fields.password && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  ✓ Password looks good
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={fields.confirmPassword}
                  onChange={(e) => {
                    set("confirmPassword", e.target.value);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({
                        ...prev,
                        confirmPassword: validateConfirm(e.target.value, fields.password),
                      }));
                  }}
                  onBlur={() => touch("confirmPassword")}
                  className={inputCls(errors.confirmPassword)}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.confirmPassword}
                </p>
              )}
              {!errors.confirmPassword && fields.confirmPassword && fields.confirmPassword === fields.password && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  ✓ Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-yellow-500 text-black py-3 rounded-xl hover:bg-yellow-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold shadow-lg shadow-yellow-500/20 active:scale-[0.98] mt-1"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 leading-relaxed">
            By signing up, you agree to our{" "}
            <button className="text-gray-900 dark:text-white font-bold hover:text-yellow-500 hover:underline">
              Terms of Service
            </button>{" "}
            and{" "}
            <button className="text-gray-900 dark:text-white font-bold hover:text-yellow-500 hover:underline">
              Privacy Policy
            </button>
          </p>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-gray-900 dark:text-white font-bold hover:text-yellow-500 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
