'use client';
import React, { useState } from 'react';
import { Copy, Loader2, Check } from 'lucide-react';
import { toast } from 'react-toastify';

export const CopyButton = ({ text, label }: { text: string, label: string }) => {
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`);
      setTimeout(() => setCopying(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
      setCopying(false);
    }
  };

  return (
    <button onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors">
      {copying ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};