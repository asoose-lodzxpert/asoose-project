import React from "react";
import { Star, User, PenLine, Trash2 } from "lucide-react";

interface Review {
  id: string;
  userId: string;
  userName: string;
  userImage?: string | null;
  rating: number;
  comment: string;
  date: string;
}

interface StoreReviewsProps {
  reviews: Review[];
  currentUserId?: string | null;
  onEdit: (review: Review) => void;
  onDelete: (reviewId: string) => void;
}

/* ===================== UTILITIES ===================== */

const formatReviewDate = (dateString: string): string => {
  const date = new Date(dateString);
  return isNaN(date.getTime())
    ? "Invalid date"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
};

const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return formatReviewDate(dateString);

  const diffDays = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

/* ===================== COMPONENT ===================== */

export const StoreReviews = ({
  reviews,
  currentUserId,
  onEdit,
  onDelete,
}: StoreReviewsProps) => {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
        <Star className="mx-auto mb-3 w-8 h-8 text-gray-300 dark:text-gray-600" />
        <p className="font-semibold">No reviews yet</p>
        <p className="text-sm">Be the first to share your experience</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const isMyReview = currentUserId === review.userId;

        return (
          <article
            key={review.id}
            className="bg-white dark:bg-[#151515] p-5 rounded-2xl border border-gray-100 dark:border-white/5"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center overflow-hidden">
                  {review.userImage ? (
                    <img
                      src={review.userImage}
                      alt={review.userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>

                <div>
                  <p className="text-sm font-bold">{review.userName}</p>
                  <p
                    className="text-[10px] text-gray-400"
                    title={formatReviewDate(review.date)}
                  >
                    {getRelativeTime(review.date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  <span className="text-xs font-bold">
                    {review.rating.toFixed(1)}
                  </span>
                </div>

                {isMyReview && (
                  <>
                    <button
                      onClick={() => onEdit(review)}
                      className="p-1.5 text-gray-400 hover:text-blue-500"
                      title="Edit review"
                    >
                      <PenLine className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(review.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500"
                      title="Delete review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {review.comment && (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {review.comment}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
};
