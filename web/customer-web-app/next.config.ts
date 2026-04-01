/** @type {import('next').NextConfig} */

// ---------------------------------------------------------------------------
// Runtime environment validation — runs when the Next.js server process starts.
// In production, this will throw and abort startup if critical OAuth env vars
// (NEXTAUTH_URL, GOOGLE_CLIENT_ID, NEXTAUTH_SECRET) are missing or malformed.
// In development, it prints warnings only.
// ---------------------------------------------------------------------------
import { assertValidEnv } from "./utils/validateEnv";
assertValidEnv();

// ---------------------------------------------------------------------------
// Content-Security-Policy
// Allows Google Maps JS API scripts, tiles, and XHR while blocking XSS vectors.
// Keep 'unsafe-eval' only because @react-google-maps/api requires it in dev;
// the Maps SDK itself uses eval()-based script loading internally.
// ---------------------------------------------------------------------------

// Derive the backend API origin from NEXT_PUBLIC_API_URL so both dev
// (http://localhost:3000) and production URLs are covered automatically.
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
const apiOrigin = (() => {
  try {
    const { origin } = new URL(apiUrl);
    return origin;
  } catch {
    return "http://localhost:3000";
  }
})();

const CSP = [
  // Default: only this origin
  "default-src 'self'",
  // Scripts: this origin + Google Maps SDK + Firebase SDK (gstatic CDN used by firebase-messaging-sw.js importScripts) + Vercel Live feedback widget
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://www.gstatic.com https://vercel.live",
  // Workers: 'self' allows same-origin service workers (Firebase SW); blob: for Maps SDK workers
  "worker-src 'self' blob:",
  // Styles: inline styles used by Maps + our Tailwind
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts
  "font-src 'self' https://fonts.gstatic.com",
  // Images: self + Maps tiles + placeholder services used in next.config images
  "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://maps.gstatic.com https://*.openstreetmap.org https://asoose-storage.s3.eu-north-1.amazonaws.com https://asoose-storage-migration.s3.us-east-1.amazonaws.com https://ffyfvbgcbvbgnmopmmhi.supabase.co https://avatars.githubusercontent.com https://stackable-eclair-kzms-p62.storage.railway.app https://loremflickr.com https://picsum.photos https://placehold.co https://via.placeholder.com",
  // XHR/Fetch: backend API + Google Maps XHR calls (geocoding relay etc.)
  `connect-src 'self' ${apiOrigin} https://*.googleapis.com https://maps.googleapis.com wss: ws:`,
  // Frames: block all
  "frame-src 'none'",
  // Objects: block all
  "object-src 'none'",
  // Base URI: restrict to self
  "base-uri 'self'",
  // Form actions: restrict to self
  "form-action 'self'",
].join("; ");

const nextConfig = {
  images: {
    qualities: [75, 85],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "asoose-storage.s3.eu-north-1.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "asoose-storage-migration.s3.us-east-1.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ffyfvbgcbvbgnmopmmhi.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "loremflickr.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "stackable-eclair-kzms-p62.storage.railway.app",
        port: "",
        pathname: "/**",
      },
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: CSP,
          },
          {
            // Prevent browsers sending the Referer header to third-party domains.
            // 'strict-origin-when-cross-origin' is the recommended modern default.
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // Prevent the page from being embedded in an iframe (clickjacking)
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // Block MIME-type sniffing
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // Disable browser features not used by the app
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
          },
        ],
      },
      // ── SEO: Prevent admin & private routes from being indexed ─────────────
      // X-Robots-Tag works at the HTTP level — effective even when bots ignore robots.txt.
      {
        source: "/super-admin/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet",
          },
        ],
      },
      {
        source: "/main/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/dashboard/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source:
          "/(sign-in|sign-up|forgot-password|reset-password|verify-otp|auth)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/payment/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
