'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Star, Loader2 } from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  initialData?: {
    rating: number;
    comment: string;
  };
}

const MAX_COMMENT_LENGTH = 1000;
const MIN_COMMENT_LENGTH = 10;

export const ReviewModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: ReviewModalProps) => {
  const isEditMode = Boolean(initialData);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [errors, setErrors] = useState<{
    rating?: string;
    comment?: string;
    submit?: string;
  }>({});

  const modalRef = useRef<HTMLDivElement>(null);

  /* ===================== SYNC STATE ===================== */
  useEffect(() => {
    if (!isOpen) return;

    setRating(initialData?.rating ?? 0);
    setComment(initialData?.comment ?? '');
    setHoverRating(0);
    setErrors({});
    setIsSubmitting(false);

    setMounted(false);
    requestAnimationFrame(() => setMounted(true));

    modalRef.current?.focus();
  }, [isOpen, initialData]);

  /* ===================== ESC TO CLOSE ===================== */
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, onClose]);

  const validate = () => {
    const nextErrors: typeof errors = {};

    if (rating === 0) {
      nextErrors.rating = 'Rating is required';
    }

    const trimmed = comment.trim();
    if (trimmed && trimmed.length < MIN_COMMENT_LENGTH) {
      nextErrors.comment = `Minimum ${MIN_COMMENT_LENGTH} characters`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await onSubmit(rating, comment.trim());
      onClose();
    } catch (err) {
      setErrors({
        submit:
          err instanceof Error ? err.message : 'Submission failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4
        bg-black/60 backdrop-blur-sm transition-opacity duration-200
        ${mounted ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        className={`w-full max-w-md rounded-3xl p-6 outline-none
          bg-white dark:bg-[#1a1a1a]
          transform transition-all duration-200 ease-out
          ${mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 id="review-title" className="text-xl font-black">
            {isEditMode ? 'Edit Review' : 'Write a Review'}
          </h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X />
          </button>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              aria-label={`Rate ${s} stars`}
              aria-pressed={rating === s}
              disabled={isSubmitting}
              onMouseEnter={() => setHoverRating(s)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(s)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setRating(s);
                }
              }}
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  s <= (hoverRating || rating)
                    ? 'fill-yellow-500 text-yellow-500'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>

        {errors.rating && (
          <p className="text-center text-sm text-red-500 mb-2">
            {errors.rating}
          </p>
        )}

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) =>
            e.target.value.length <= MAX_COMMENT_LENGTH &&
            setComment(e.target.value)
          }
          disabled={isSubmitting}
          className="w-full h-32 p-4 rounded-xl resize-none border
            focus:outline-none focus:ring-2 focus:ring-yellow-500"
          placeholder="Share your experience (optional)"
        />

        <div className="flex justify-between text-xs mt-2 mb-2 text-gray-500">
          <span>
            {comment.trim() &&
            comment.trim().length < MIN_COMMENT_LENGTH
              ? `Min ${MIN_COMMENT_LENGTH} chars`
              : 'Optional'}
          </span>
          <span>{MAX_COMMENT_LENGTH - comment.length} left</span>
        </div>

        {errors.comment && (
          <p className="text-sm text-red-500 mb-3">
            {errors.comment}
          </p>
        )}

        {errors.submit && (
          <p className="text-sm text-red-600 mb-3">
            {errors.submit}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-12 bg-yellow-500 rounded-xl font-bold
            disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="inline mr-2 animate-spin" />
              Submitting…
            </>
          ) : isEditMode ? (
            'Update Review'
          ) : (
            'Submit Review'
          )}
        </button>
      </div>
    </div>
  );
};
