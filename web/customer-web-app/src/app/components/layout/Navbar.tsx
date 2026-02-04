'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon, Menu, X } from 'lucide-react';
import Image from 'next/image';

export default function Navbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  if (!mounted) return <nav className="h-16 border-b" />;

  const darkMode = resolvedTheme === 'dark';

  const navLinks = [
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Book a Ride', href: '/main/ride' },
    { name: 'Make orders', href: '/main/store' },
    { name: 'Make Deliveries', href: '/main/delivery' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-colors ${
      darkMode ? 'bg-[#0a0a0a]/80 border-white/10' : 'bg-white/80 border-black/5'
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
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
          <span className={`text-lg font-black tracking-tight hidden sm:block ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
            Asoose 
          </span>
        </Link>

        {/* Desktop Links & Actions */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex gap-6 text-xs font-bold uppercase tracking-widest">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  className={`transition-colors hover:text-yellow-500 ${
                    isActive ? 'text-yellow-500' : darkMode ? 'text-zinc-300' : 'text-zinc-600'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className={`h-6 w-px ${darkMode ? 'bg-white/20' : 'bg-black/10'}`} />

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(darkMode ? 'light' : 'dark')} 
              className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-black/5 text-zinc-600'}`}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <Link 
              href="/sign-up" 
              className="bg-yellow-400 text-black px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-yellow-300 transition-all active:scale-95"
            >
              Sign up
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
            Sign up
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
        <div className={`md:hidden fixed top-16 left-0 right-0 border-b shadow-2xl animate-in slide-in-from-top-5 ${darkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-black/5'}`}>
          <div className="p-6 flex flex-col gap-6 font-bold uppercase tracking-widest text-sm">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`transition-colors ${isActive ? 'text-yellow-500' : darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}
                >
                  {link.name}
                </Link>
              );
            })}
            
            <div className={`h-px w-full ${darkMode ? 'bg-white/10' : 'bg-black/5'}`} />

            <div className="flex items-center justify-between">
               <span className={darkMode ? 'text-zinc-400' : 'text-zinc-600'}>Theme</span>
               <button 
                onClick={() => setTheme(darkMode ? 'light' : 'dark')} 
                className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 text-yellow-500"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                <span className="text-xs">{darkMode ? 'Light' : 'Dark'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}