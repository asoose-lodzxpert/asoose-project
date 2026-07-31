"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Menu, X, Shield } from "lucide-react";

interface Section {
  id: string;
  title: string;
  icon?: React.ReactNode;
}

interface PrivacyLayoutProps {
  sections: Section[];
  children: React.ReactNode;
}

export default function PrivacyLayout({ sections, children }: PrivacyLayoutProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-yellow-500 text-black rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95"
        aria-label="Toggle Navigation"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-80 bg-gray-50/50 dark:bg-white/[0.02] border-r border-gray-100 dark:border-white/5 z-40 transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:sticky lg:top-20 lg:h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar`}
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10 text-yellow-600 dark:text-yellow-500">
            <Shield className="w-6 h-6" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] opacity-80">
              On this page
            </h2>
          </div>

          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all text-left group ${
                  activeSection === section.id
                    ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5"
                }`}
              >
                <span className={`shrink-0 transition-transform duration-300 ${activeSection === section.id ? "scale-110" : "group-hover:scale-110"}`}>
                  {section.icon || <ChevronRight size={16} />}
                </span>
                <span className="truncate">{section.title}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-gray-100 dark:border-white/5">
          <Link 
            href="/contact"
            className="block p-4 rounded-2xl bg-zinc-900 dark:bg-yellow-500/10 text-white dark:text-yellow-500 text-center text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95"
          >
            Need help? Contact us
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col items-center">
        <div className="w-full max-w-4xl px-6 py-12 lg:py-20 lg:px-12 prose dark:prose-invert prose-zinc max-w-none">
          {children}
        </div>
        
        {/* Simple Footer for Document */}
        <div className="w-full max-w-4xl px-12 pb-20 border-t border-gray-100 dark:border-white/5 mt-12 pt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-widest opacity-30">
          <span>© {new Date().getFullYear()} Asoose Technologies Inc.</span>
          <div className="flex gap-8">
            <Link href="/terms" className="hover:text-yellow-500 transition-colors">Terms</Link>
            <Link href="/privacy-policy" className="hover:text-yellow-500 transition-colors">Privacy</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
