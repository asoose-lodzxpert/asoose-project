"use client";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const SignIn = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!loginData.email || !loginData.password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: loginData.email,
        password: loginData.password,
        redirect: false, // Keep false so we can handle the redirect manually
      });

      if (result?.error) {
        setError("Invalid email or password");
        return;
      }

      // 1. Fetch the updated session to determine the user's role
      const { getSession } = await import("next-auth/react");
      const session = await getSession();

      // 2. Define the admin roles allowed to access the dashboard
      const ADMIN_ROLES = [
        "SUPER_ADMIN",
        "ADMIN_MANAGER",
        "ADMIN_SUPPORT",
        "ADMIN_FINANCE",
      ];

      // 3. Perform dynamic redirection based on the role found in the session
      if (session?.user?.role && ADMIN_ROLES.includes(session.user.role)) {
        router.push("/super-admin/dashboard");
      } else {
        router.push("/main/store");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signIn("google", {
        callbackUrl: "/main/store",
      });
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 transition-colors duration-300 bg-white dark:bg-[#0a0a0a]">
      <div className="w-full max-w-sm">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">
            Sign in
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Welcome back to Asoose
          </p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/20">
              {error}
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleSignIn}
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors bg-white dark:bg-white/5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
              Continue with Google
            </span>
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-white dark:bg-[#0a0a0a] text-gray-500 dark:text-gray-500 font-bold tracking-wider">
                or
              </span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={loginData.email}
                onChange={(e) =>
                  setLoginData({ ...loginData, email: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 bg-gray-50 dark:bg-white/5 dark:border-white/20"
                />
                <span className="text-gray-600 dark:text-gray-400">
                  Remember me
                </span>
              </label>
              <Link
                href={"/forgot-password"}
                type="button"
                className="text-gray-900 dark:text-white font-medium hover:text-yellow-500 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-yellow-500 text-black py-3 rounded-xl hover:bg-yellow-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold  active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{" "}
            <Link
              href="/sign-up"
              className="text-gray-900 dark:text-white font-bold hover:text-yellow-500 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
