"use client";

import Link from "next/link";

// Social icon SVGs
function TwitterX() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function Instagram() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function Facebook() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export default function Footer() {
  const CUSTOMER_IOS_URL = "https://apps.apple.com/ng/app/asoose/id6761648911";
  const CUSTOMER_ANDROID_URL =
    "https://play.google.com/store/apps/details?id=com.asoose.app";

  const footerSections = [
    {
      title: "Company",
      links: [
        { n: "About Us", h: "/about" },
        { n: "Contact Us", h: "/contact" },
        { n: "Careers", h: "#" },
      ],
    },
    {
      title: "Our Services",
      links: [
        { n: "Book a ride", h: "/main/ride" },
        { n: "Food & Groceries", h: "/main/store" },
        { n: "Logistics", h: "/main/delivery" },
      ],
    },
  ];

  const socials = [
    { label: "X (Twitter)", href: "#", icon: <TwitterX /> },
    { label: "Instagram", href: "#", icon: <Instagram /> },
    { label: "Facebook", href: "#", icon: <Facebook /> },
  ];

  return (
    <footer className="bg-white dark:bg-[#0a0a0a] border-t border-zinc-100 dark:border-white/10 text-zinc-600 dark:text-zinc-400 transition-colors duration-300">

      {/* ── Main content ── */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">

          {/* Brand column — wide */}
          <div className="md:col-span-5 flex flex-col gap-6">
            <div>
              <div className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">
                Asoose
              </div>
              <p className="text-sm font-medium leading-relaxed max-w-xs">
                Moving the city forward with speed and trust.
              </p>
            </div>

            {/* App download buttons */}
            <div className="flex flex-col gap-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                Download the app
              </p>
              <div className="flex flex-wrap gap-3">
                {/* App Store */}
                <a
                  href={CUSTOMER_IOS_URL}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-white/10 hover:border-yellow-400 dark:hover:border-yellow-400 hover:text-yellow-500 transition-all text-zinc-700 dark:text-zinc-300"
                >
                  <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.3-3.14-2.53-2.14-3.5-3.09-8.48 2-10.92 1.34-.65 2.62-.2 3.65-.2 1.27 0 2.21.72 2.87.72.65 0 2.05-.88 3.49-.75 2.49.19 3.98 1.5 4.38 1.87-.03.05-2.62 1.52-2.58 4.63.02 3.09 2.72 4.17 2.92 4.23-.05.19-.42 1.44-1.38 2.85M13 3.5c.73-.83 1.21-1.96 1.07-3.11-1.05.05-2.32.74-2.99 1.53-.61.72-1.15 1.86-1.01 2.98 1.17.09 2.33-.71 2.93-1.4z" />
                  </svg>
                  <span className="text-[11px] font-bold">App Store</span>
                </a>

                {/* Google Play */}
                <a
                  href={CUSTOMER_ANDROID_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-white/10 hover:border-yellow-400 dark:hover:border-yellow-400 hover:text-yellow-500 transition-all text-zinc-700 dark:text-zinc-300"
                >
                  <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                  </svg>
                  <span className="text-[11px] font-bold">Google Play</span>
                </a>
              </div>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-white/10 hover:border-yellow-400 hover:text-yellow-500 dark:hover:border-yellow-400 transition-all text-zinc-500 dark:text-zinc-400"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Spacer */}
          <div className="hidden md:block md:col-span-1" />

          {/* Link columns */}
          <div className="md:col-span-6 grid grid-cols-2 gap-8">
            {footerSections.map((section, i) => (
              <div key={i} className="space-y-4">
                <div className="font-black uppercase text-[10px] tracking-widest text-zinc-400 dark:text-zinc-500">
                  {section.title}
                </div>
                <div className="flex flex-col gap-3">
                  {section.links.map((link, j) => (
                    <Link
                      key={j}
                      href={link.h}
                      className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors w-fit"
                    >
                      {link.n}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-zinc-100 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-30">
            © 2026 Asoose Technologies Inc.
          </span>
          <div className="flex gap-5 text-[10px] font-black uppercase tracking-[0.18em] opacity-30">
            <Link href="/privacy" className="hover:opacity-70 transition-opacity">
              Privacy
            </Link>
            <Link href="/terms" className="hover:opacity-70 transition-opacity">
              Terms
            </Link>
          </div>
        </div>
      </div>

    </footer>
  );
}