"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Link2, Unlink, Loader2 } from "lucide-react";

interface LinkedStatus {
  google: boolean;
  apple: boolean;
}

/**
 * Decodes a Google credential JWT (ID token) without a crypto library.
 * Only used to extract the payload claims from the base-64 encoded middle segment.
 */
function decodeGoogleJwt(token: string) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join(""),
  );
  return JSON.parse(jsonPayload) as {
    sub: string;
    email: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    name?: string;
  };
}

export function LinkedAccountsSection() {
  const [status, setStatus] = useState<LinkedStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"google" | null>(null);
  const gsiRef = useRef<boolean>(false);

  // ── Fetch linked status ────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/linked-accounts");
      if (!res.ok) throw new Error("Failed to load");
      const data: LinkedStatus = await res.json();
      setStatus(data);
    } catch {
      toast.error("Could not load linked accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ── Google Identity Services initialisation ────────────────────────────────
  const initGsi = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || gsiRef.current) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    gsiRef.current = true;
  }, []);

  useEffect(() => {
    initGsi();
  }, [initGsi]);

  // ── Link Google ────────────────────────────────────────────────────────────
  const handleLinkGoogle = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error("Google client ID is not configured");
      return;
    }

    setActionLoading("google");

    (window as any).google?.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          const payload = decodeGoogleJwt(response.credential);

          const res = await fetch("/api/auth/linked-accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: "google",
              googleId: payload.sub,
              email: payload.email,
              firstName:
                payload.given_name ?? payload.name?.split(" ")[0] ?? "",
              lastName:
                payload.family_name ??
                payload.name?.split(" ").slice(1).join(" ") ??
                "",
              profilePicture: payload.picture,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to link Google");

          setStatus((prev) => (prev ? { ...prev, google: true } : prev));
          toast.success("Google account linked!");
        } catch (err: any) {
          toast.error(err.message || "Failed to link Google account");
        } finally {
          setActionLoading(null);
        }
      },
    });

    (window as any).google?.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap was suppressed — fall back to the popup
        setActionLoading(null);
        toast.info(
          "Google Sign-In prompt was suppressed. Please try again or check browser settings.",
        );
      }
    });
  };

  // ── Unlink Google ──────────────────────────────────────────────────────────
  const handleUnlinkGoogle = async () => {
    setActionLoading("google");
    try {
      const res = await fetch("/api/auth/linked-accounts?provider=google", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to unlink Google");

      setStatus((prev) => (prev ? { ...prev, google: false } : prev));
      toast.success("Google account unlinked");
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink Google account");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Google row */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-3">
          {/* Google "G" badge */}
          <div className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center border border-gray-100 dark:border-white/10">
            {/* Inline SVG for the Google "G" */}
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Google
            </p>
            <p
              className={`text-xs mt-0.5 ${
                status?.google
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-400"
              }`}
            >
              {status?.google ? "Linked" : "Not linked"}
            </p>
          </div>
        </div>

        {status?.google ? (
          <button
            onClick={handleUnlinkGoogle}
            disabled={actionLoading === "google"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            {actionLoading === "google" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Unlink className="w-3.5 h-3.5" />
            )}
            Unlink
          </button>
        ) : (
          <button
            onClick={handleLinkGoogle}
            disabled={actionLoading === "google"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {actionLoading === "google" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Link2 className="w-3.5 h-3.5" />
            )}
            Link
          </button>
        )}
      </div>

      {/* Apple note — not supported on web */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 opacity-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-white"
              aria-hidden="true"
            >
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Apple
            </p>
            <p className="text-xs mt-0.5 text-gray-400">
              Available on iOS app only
            </p>
          </div>
        </div>
        <span className="text-xs text-gray-400 font-medium">Not available</span>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 pt-1 leading-relaxed">
        You can only unlink a provider if you have another sign-in method
        (email/password or another linked provider) configured.
      </p>
    </div>
  );
}
