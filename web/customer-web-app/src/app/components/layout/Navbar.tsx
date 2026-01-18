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
    { name: 'Make Deliveries', href: '/main/store' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-colors ${
      darkMode ? 'bg-[#0a0a0a]/80 border-white/10' : 'bg-white/80 border-black/5'
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo - Left side */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-12 h-12">
            <Image 
              src="/logo.png" 
              alt="Asoose Logo"
              width={48}
              height={48}
              className="object-cover"
              priority
            />
          </div>
        </Link>

        {/* Desktop Links - Moved to right */}
        <div className="hidden md:flex items-center gap-8">
          {/* Navigation Links */}
          <div className="flex gap-8 text-sm font-bold uppercase tracking-wider">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  className={`transition-colors hover:text-yellow-500 ${
                    isActive ? 'text-yellow-500' : darkMode ? 'text-white' : 'text-black'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className={`h-6 w-px ${darkMode ? 'bg-white/20' : 'bg-black/10'}`} />

          {/* Actions - Right side */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(darkMode ? 'light' : 'dark')} 
              className="p-2 hover:text-yellow-500 transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            {/* Sign-up button */}
            <Link 
              href="/sign-up" 
              className="bg-yellow-400 text-black px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-yellow-300 transition-all active:scale-95"
            >
              Sign up
            </Link>
          </div>
        </div>

        {/* Mobile menu button */}
        <button 
          className="md:hidden" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <X size={20}/> : <Menu size={20}/>}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className={`md:hidden fixed top-16 left-0 right-0 p-6 border-b shadow-xl ${darkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-black/5'}`}>
          <div className="flex flex-col gap-6 font-bold uppercase tracking-widest text-sm">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`transition-colors ${isActive ? 'text-yellow-500' : darkMode ? 'text-white' : 'text-black'}`}
                >
                  {link.name}
                </Link>
              );
            })}
            
            {/* Mobile theme toggle */}
            <button 
              onClick={() => {
                setTheme(darkMode ? 'light' : 'dark');
                setIsMobileMenuOpen(false);
              }} 
              className="flex items-center gap-3 p-2 hover:text-yellow-500 transition-colors"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            {/* Mobile sign-up button */}
            <Link 
              href="/sign-up" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="bg-yellow-400 text-black px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-yellow-300 transition-all active:scale-95 text-center"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}