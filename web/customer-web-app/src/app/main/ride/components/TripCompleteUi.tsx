"use client";

import React, { useState } from "react";
import { Star, MessageCircle, AlertCircle, CheckCircle2, X, MapPin } from "lucide-react";

interface TripCompleteUIProps {
  driverName: string; // Required prop as per error log
  price: number;
  pickup: string;
  dropoff: string;
  onClose: () => void;
}

export default function TripCompleteUI({
  driverName,
  price,
  pickup,
  dropoff,
  onClose,
}: TripCompleteUIProps) {
  const [rating, setRating] = useState(0);
  const [step, setStep] = useState<"RATING" | "SUPPORT" | "FINISHED">("RATING");

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0a0a0a] overflow-y-auto transition-colors duration-300">
      {step === "RATING" && (
        <div className="p-6 text-center animate-in zoom-in duration-300">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle2 size={48} />
            </div>
          </div>
          <h2 className="text-2xl font-black mb-1 text-gray-900 dark:text-white">Arrived!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 font-bold">₦{price.toLocaleString()}</p>

          <div className="mb-8 text-left bg-gray-50 dark:bg-zinc-900/30 p-4 rounded-xl border dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-2">
              <MapPin size={16} className="text-emerald-500 shrink-0" />
              <p className="text-xs text-gray-600 dark:text-zinc-400 truncate">{pickup}</p>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-red-500 shrink-0" />
              <p className="text-xs text-gray-600 dark:text-zinc-400 truncate">{dropoff}</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-3xl p-6 mb-6">
            <p className="font-bold text-gray-900 dark:text-gray-100 mb-4">How was your ride with {driverName}?</p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)}>
                  <Star size={32} className={rating >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
                </button>
              ))}
            </div>
            <textarea
              placeholder="Add a comment (optional)"
              className="w-full p-4 rounded-xl border dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm h-24 resize-none"
            />
          </div>

          <button onClick={() => setStep("FINISHED")} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold">
            Submit Rating
          </button>
        </div>
      )}

      {step === "FINISHED" && (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold mb-2">Thank you!</h3>
          <p className="text-gray-500 mb-8">Your feedback helps us improve.</p>
          <button onClick={onClose} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold">
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}