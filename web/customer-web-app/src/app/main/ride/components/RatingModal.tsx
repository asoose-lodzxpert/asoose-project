'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRideStore } from "../store/ride";
import { RideService } from '@/services/ride.service';
import { Star } from "lucide-react";
import { toast } from 'react-toastify';

export function RatingModal() {
  const { data: session } = useSession();
  const rideId = useRideStore((state) => state.rideId);
  const rating = useRideStore((state) => state.rating);
  const setRating = useRideStore((state) => state.setRating);
  const feedback = useRideStore((state) => state.feedback);
  const setFeedback = useRideStore((state) => state.setFeedback);
  const resetRide = useRideStore((state) => state.resetRide);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Require a star rating before allowing submission
    if (!rating) {
      toast.info('Please select a star rating before submitting.');
      return;
    }

    // Submit to backend if we have the required data
    if (rideId && rating && session?.accessToken) {
      setIsSubmitting(true);
      try {
        await RideService.rateDriver(rideId, rating, feedback || '', session.accessToken);
        toast.success('Thanks for your feedback!');
      } catch (error) {
        console.error('Failed to submit rating:', error);
        toast.error('Could not submit rating. Please try again.');
        setIsSubmitting(false);
        return; // Don't reset if submission failed — let user retry
      }
    }

    resetRide();
  };

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 w-full max-w-sm border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95">
        <h2 className="text-2xl font-black text-center mb-2 text-zinc-900 dark:text-white">Rate your Driver</h2>
        <p className="text-center text-zinc-500 dark:text-zinc-400 mb-8 text-sm">How was your experience?</p>
        
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className="transition-transform hover:scale-110 focus:outline-none"
              onClick={() => setRating(star)}
            >
              <Star 
                size={36} 
                className={rating && rating >= star ? "fill-yellow-400 text-yellow-400" : "fill-zinc-100 dark:fill-zinc-800 text-zinc-200 dark:text-zinc-700"} 
              />
            </button>
          ))}
        </div>

        <textarea
          className="w-full bg-zinc-50 dark:bg-zinc-800 border-0 rounded-xl p-4 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-yellow-400 resize-none mb-6 text-sm"
          rows={3}
          placeholder="Leave a comment (optional)..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        
        <button
          className="w-full bg-yellow-400 text-black py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition-colors shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={!rating || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>

        {/* H5/L7 fix: allow user to skip rating without blocking the UI */}
        <button
          className="w-full mt-2 py-3 rounded-xl text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          onClick={() => resetRide()}
          disabled={isSubmitting}
        >
          Skip
        </button>
      </div>
    </div>
  );
}