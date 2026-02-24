/** @type {import('next').NextConfig} */

// ---------------------------------------------------------------------------
// Content-Security-Policy
// Allows Google Maps JS API scripts, tiles, and XHR while blocking XSS vectors.
// Keep 'unsafe-eval' only because @react-google-maps/api requires it in dev;
// the Maps SDK itself uses eval()-based script loading internally.
// ---------------------------------------------------------------------------

// Derive the backend API origin from NEXT_PUBLIC_API_URL so both dev
// (http://localhost:3000) and production URLs are covered automatically.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const apiOrigin = (() => {
  try {
    const { origin } = new URL(apiUrl);
    return origin;
  } catch {
    return 'http://localhost:3000';
  }
})();

const CSP = [
  // Default: only this origin
  "default-src 'self'",
  // Scripts: this origin + Google Maps SDK entry points
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com",
  // Workers (Maps SDK uses web workers)
  "worker-src blob:",
  // Styles: inline styles used by Maps + our Tailwind
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts
  "font-src 'self' https://fonts.gstatic.com",
  // Images: self + Maps tiles + placeholder services used in next.config images
  "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://maps.gstatic.com https://*.openstreetmap.org https://asoose-storage.s3.eu-north-1.amazonaws.com https://ffyfvbgcbvbgnmopmmhi.supabase.co https://avatars.githubusercontent.com https://stackable-eclair-kzms-p62.storage.railway.app https://loremflickr.com https://picsum.photos https://placehold.co https://via.placeholder.com",
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
].join('; ');

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'asoose-storage.s3.eu-north-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ffyfvbgcbvbgnmopmmhi.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
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
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: CSP,
          },
          {
            // Prevent browsers sending the Referer header to third-party domains.
            // 'strict-origin-when-cross-origin' is the recommended modern default.
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // Prevent the page from being embedded in an iframe (clickjacking)
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            // Block MIME-type sniffing
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Disable browser features not used by the app
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)',
          },
        ],
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

module.exports = nextConfig;