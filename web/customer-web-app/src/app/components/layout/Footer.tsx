'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

export default function Footer() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const darkMode = resolvedTheme === 'dark';

  const footerSections = [
    {
      title: "Company",
      links: [{ n: "About Us", h: "/about" }, { n: "Contact Us", h: "/contact" }, { n: "Careers", h: "#" }]
    },
    {
      title: "our services",
      links: [{ n: "Book a ride", h: "/main/ride" }, { n: "Food, groceries and essentials", h: "/main/store" }, { n: "Logistics", h: "/main/delivery" }]
    },
    {
      title: "Partner",
      links: [
        { n: "Drive with Asoose", h: "https://play.google.com/store/apps/details?id=com.asoose.rider" },
        { n: "Vendor Solutions", h: "https://play.google.com/store/apps/details?id=com.asoose.vendor" }
      ]
    }
  ];

  return (
    <footer className={`py-20 px-6 border-t ${darkMode ? 'bg-black border-white/10 text-gray-400' : 'bg-white border-black/10 text-gray-600'}`}>
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
        <div className="col-span-2 md:col-span-1 space-y-4">
          <div className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>Asoose Lodzxpert</div>
          <p className="text-sm font-medium leading-relaxed">Moving the city forward with speed and trust.</p>
        </div>

        {footerSections.map((section, i) => (
          <div key={i} className="space-y-4">
            <div className="font-black uppercase text-xs tracking-widest opacity-40">{section.title}</div>
            <div className="flex flex-col gap-3">
              {section.links.map((link, j) => (
                <Link key={j} href={link.h} className="text-sm font-bold hover:text-yellow-500 transition-colors">
                  {link.n}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className={`max-w-7xl mx-auto pt-8 border-t ${darkMode ? 'border-white/5' : 'border-black/5'} flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] opacity-30`}>
        <span>© 2026 Asoose Technologies Inc.</span>
        <div className="flex gap-6">
          <Link href="/privacy" className="hover:text-yellow-500">Privacy</Link>
          <Link href="/terms" className="hover:text-yellow-500">Terms</Link>
        </div>
      </div>
    </footer>
  );
}