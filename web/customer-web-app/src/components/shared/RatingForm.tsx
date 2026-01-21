"use client";

import React, { useState } from "react";

export interface RatingFormProps {
  type: "ride" | "delivery";
  id: string;
  driverName?: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onSkip?: () => void;
}

export const RatingForm: React.FC<RatingFormProps> = ({
  type,
  id,
  driverName,
  onSubmit,
  onSkip,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(rating, comment);
    } catch (err: any) {
      setError(err.message || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingText = (stars: number) => {
    switch (stars) {
      case 1:
        return "Poor";
      case 2:
        return "Fair";
      case 3:
        return "Good";
      case 4:
        return "Very Good";
      case 5:
        return "Excellent";
      default:
        return "Select rating";
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2">
        Rate Your {type === "ride" ? "Ride" : "Delivery"}
      </h2>
      <p className="text-gray-600 mb-6">
        {driverName
          ? `How was your experience with ${driverName}?`
          : "How was your experience?"}
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Star Rating */}
      <div className="mb-6">
        <div className="flex justify-center gap-2 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={star <= (hoveredRating || rating) ? "#FFD700" : "#E5E7EB"}
                className="w-12 h-12 transition-colors"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </button>
          ))}
        </div>
        <p className="text-center text-lg font-medium text-gray-700">
          {getRatingText(hoveredRating || rating)}
        </p>
      </div>

      {/* Comment */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-gray-700">
          Additional Comments (Optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={`Share your feedback about the ${type}...`}
          rows={4}
          maxLength={500}
          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-gray-500 mt-1 text-right">
          {comment.length}/500 characters
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={submitting}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "Submit Rating"}
        </button>
      </div>

      {/* Quick Feedback Tags (Optional Enhancement) */}
      {rating > 0 && rating < 4 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm font-medium mb-3 text-gray-700">
            What went wrong?
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "Driver was late",
              "Unprofessional behavior",
              "Vehicle was dirty",
              "Unsafe driving",
              "Wrong route taken",
              "Other",
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setComment((prev) => (prev ? `${prev}, ${tag}` : tag))
                }
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-full hover:bg-gray-100 transition"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {rating === 5 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm font-medium mb-3 text-gray-700">
            What did you love?
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "Great driver",
              "Clean vehicle",
              "On time",
              "Smooth ride",
              "Professional",
              "Friendly",
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setComment((prev) => (prev ? `${prev}, ${tag}` : tag))
                }
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-full hover:bg-gray-100 transition"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
