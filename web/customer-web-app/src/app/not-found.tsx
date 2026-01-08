import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-center p-4">
      {/* Icon with Glow Effect */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-20 rounded-full"></div>
        <div className="relative bg-[#1E293B] p-6 rounded-2xl border border-gray-800 shadow-xl">
          <FileQuestion className="w-16 h-16 text-yellow-500" />
        </div>
      </div>

      {/* Text Content */}
      <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
        Page Not Found
      </h1>
      <p className="text-gray-400 max-w-md mb-8">
        The page you are looking for does not exist!.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link 
          href="/home" 
          className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-yellow-500/20"
        >
          <Home className="w-4 h-4" /> Go to Home
        </Link>
        
        <Link 
          href=".." 
          className="flex items-center gap-2 px-6 py-3 bg-[#1E293B] hover:bg-[#334155] text-white font-bold rounded-xl border border-gray-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </Link>
      </div>
    </div>
  );
}