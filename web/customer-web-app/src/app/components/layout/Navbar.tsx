"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, Menu, X } from "lucide-react";
import Image from "next/image";
import { trackMetaEvent } from "@/lib/meta-pixel";

export default function Navbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  if (!mounted) return <nav className="h-16 border-b" />;

  const darkMode = resolvedTheme === "dark";

  const navLinks = [
    { name: "Marketplace", href: "/main/store" },
    { name: "Rides", href: "/main/ride" },
    { name: "Delivery", href: "/main/delivery" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 border-b backdrop-blur-xl transition-colors ${
        darkMode
          ? "bg-[#0a0a0a]/80 border-white/10"
          : "bg-white/80 border-black/5"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 relative transition-transform group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="Asoose Logo"
              width={40}
              height={40}
              className="object-cover"
              priority
            />
          </div>
          {/* App Name - Hidden on small mobile, visible on sm+ */}
          <span
            className={`text-lg font-black tracking-tight hidden sm:block ${darkMode ? "text-white" : "text-zinc-900"}`}
          >
            Asoose
          </span>
        </Link>

        {/* Desktop Links & Actions */}
        <div className="hidden items-center gap-7 md:flex">
          <div className="flex gap-6 text-sm font-bold">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => {
                    if (link.href === "/contact") {
                      trackMetaEvent("Contact", {
                        content_name: "contact_navigation",
                        contact_method: "contact_page",
                      });
                    }
                  }}
                  className={`transition-colors hover:text-yellow-500 ${
                    isActive
                      ? "text-yellow-500"
                      : darkMode
                        ? "text-zinc-300"
                        : "text-zinc-600"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div
            className={`h-6 w-px ${darkMode ? "bg-white/20" : "bg-black/10"}`}
          />

          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(darkMode ? "light" : "dark")}
              className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-white/10 text-zinc-400" : "hover:bg-black/5 text-zinc-600"}`}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              href="/sign-in"
              className={`text-sm font-bold transition-colors hover:text-yellow-600 ${darkMode ? "text-zinc-300" : "text-zinc-600"}`}
            >
              Sign in
            </Link>
            <Link 
              href="/sign-up" 
              className="rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-black text-black transition-all hover:bg-yellow-300 active:scale-95"
            >
              Get started
            </Link>
          </div>
        </div>

        {/* Mobile Actions (Visible on small screens) */}
        <div className="flex items-center gap-3 md:hidden">
          {/* Mobile Sign Up Button - Now visible outside menu */}
          <Link 
            href="/sign-up" 
            className="bg-yellow-400 text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-yellow-300 transition-all active:scale-95"
          >
            Get started
          </Link>

          {/* Mobile menu toggle */}
          <button 
            className="p-2" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? 
              <X size={24} className={darkMode ? 'text-white' : 'text-black'}/> : 
              <Menu size={24} className={darkMode ? 'text-white' : 'text-black'}/>
            }
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className={`md:hidden fixed top-16 left-0 right-0 border-b shadow-2xl animate-in slide-in-from-top-5 ${darkMode ? "bg-[#0a0a0a] border-white/10" : "bg-white border-black/5"}`}
        >
          <div className="p-6 flex flex-col gap-6 font-bold uppercase tracking-widest text-sm">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (link.href === "/contact") {
                      trackMetaEvent("Contact", {
                        content_name: "contact_navigation",
                        contact_method: "contact_page",
                      });
                    }
                  }}
                  className={`transition-colors ${isActive ? "text-yellow-500" : darkMode ? "text-zinc-300" : "text-zinc-600"}`}
                >
                  {link.name}
                </Link>
              );
            })}

            <div
              className={`h-px w-full ${darkMode ? "bg-white/10" : "bg-black/5"}`}
            />

            <Link
              href="/sign-in"
              onClick={() => setIsMobileMenuOpen(false)}
              className={darkMode ? "text-zinc-300" : "text-zinc-600"}
            >
              Sign in
            </Link>

            <div className="flex items-center justify-between">
              <span className={darkMode ? "text-zinc-400" : "text-zinc-600"}>
                Theme
              </span>
              <button
                onClick={() => setTheme(darkMode ? "light" : "dark")}
                className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 text-yellow-500"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                <span className="text-xs">{darkMode ? "Light" : "Dark"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
