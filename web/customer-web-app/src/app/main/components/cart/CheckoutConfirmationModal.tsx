"use client";

import React from "react";
import { Phone, X } from "lucide-react";

interface CheckoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CheckoutConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
}: CheckoutConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#151515] rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pt-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-500/10 rounded-full mb-6">
            <Phone className="w-10 h-10 text-yellow-500" />
          </div>

          <h3 className="text-2xl font-black mb-4">Availability Check</h3>
          
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
            Our platform may call you to verify if an item you ordered is available or in stock.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-all active:scale-[0.98]"
            >
              Continue to Checkout
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 py-4 rounded-2xl font-bold hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
