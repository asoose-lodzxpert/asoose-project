import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 select-none">
      {/* 404 Visual */}
      <div className="mb-4">
        <span className="text-[12rem] font-black leading-none tracking-tighter text-white/5">
          404
        </span>
      </div>

      {/* Text Content */}
      <div className="text-center space-y-2 mb-12">
        <h1 className="text-xl font-bold text-white uppercase tracking-[0.3em]">
          Lost in Space
        </h1>
        <p className="text-zinc-500 text-sm font-medium">
          The page you requested does not exist.
        </p>
      </div>

      {/* Simplified Action */}
      <Link 
        href="/home" 
        className="group flex items-center gap-3 text-yellow-500 hover:text-white transition-colors duration-300"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        <span className="text-xs font-black uppercase tracking-widest">Return to Base</span>
      </Link>
    </div>
  );
}