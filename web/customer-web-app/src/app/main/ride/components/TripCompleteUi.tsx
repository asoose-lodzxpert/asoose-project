"use client";

import React, { useState } from "react";
import {
  Star,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  X,
  MapPin,
} from "lucide-react";

interface TripCompleteUIProps {
  driverName: string;
  price: number;
  pickup?: string; // Added optional prop
  dropoff?: string; // Added optional prop
  date?: string; // Added optional prop
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

  const commonIssues = [
    "Left an item behind",
    "Safety concern during ride",
    "Incorrect fare charged",
    "Poor vehicle quality",
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0a0a0a] overflow-y-auto no-scrollbar transition-colors duration-300">
      {step === "RATING" && (
        <div className="p-6 text-center animate-in zoom-in duration-300">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle2 size={48} />
            </div>
          </div>
          <h2 className="text-2xl font-black mb-1 text-gray-900 dark:text-white">
            Arrived!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You paid ₦{price.toLocaleString()}
          </p>

          {/* Optional Trip Summary Section */}
          {pickup && dropoff && (
            <div className="mb-8 text-left bg-gray-50 dark:bg-zinc-900/30 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
              <div className="flex items-start gap-3 mb-2">
                <MapPin
                  size={16}
                  className="text-emerald-500 mt-0.5 shrink-0"
                />
                <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-1">
                  {pickup}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-1">
                  {dropoff}
                </p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-3xl p-6 mb-6 border border-transparent dark:border-zinc-800">
            <p className="font-bold text-gray-900 dark:text-gray-100 mb-4">
              How was your ride with {driverName}?
            </p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  type="button"
                >
                  <Star
                    size={32}
                    className={`${rating >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300 dark:text-zinc-700"} transition-transform active:scale-125`}
                  />
                </button>
              ))}
            </div>
            <textarea
              placeholder="Add a comment (optional)"
              className="w-full p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all h-24 resize-none"
            />
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setStep("FINISHED")}
              className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold shadow-lg shadow-gray-200 dark:shadow-none transition-colors"
            >
              Submit Rating
            </button>
            <button
              onClick={() => setStep("SUPPORT")}
              className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-400 dark:text-zinc-500 py-2 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
            >
              <AlertCircle size={16} /> Report an issue
            </button>
          </div>
        </div>
      )}

      {step === "SUPPORT" && (
        <div className="p-6 animate-in slide-in-from-right-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Help Center
            </h3>
            <button
              onClick={() => setStep("RATING")}
              className="hover:bg-gray-100 dark:hover:bg-zinc-900 p-1 rounded-full transition-colors"
            >
              <X size={24} className="text-gray-400 dark:text-zinc-500" />
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mb-4 font-medium uppercase tracking-wider">
            Common Issues
          </p>
          <div className="space-y-2">
            {commonIssues.map((issue, i) => (
              <button
                key={i}
                className="w-full text-left p-4 rounded-xl border border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900/50 flex items-center justify-between group transition-colors"
              >
                <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                  {issue}
                </span>
                <MessageCircle
                  size={18}
                  className="text-gray-300 dark:text-zinc-600 group-hover:text-emerald-500 transition-colors"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "FINISHED" && (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-4 animate-bounce">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            Thank you!
          </h3>
          <p className="text-gray-500 dark:text-zinc-400 mb-8 leading-relaxed">
            Your feedback helps us keep the community safe and reliable.
          </p>
          <button
            onClick={onClose}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 dark:shadow-none transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
