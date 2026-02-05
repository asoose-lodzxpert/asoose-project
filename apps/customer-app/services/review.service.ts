import { request } from "@/lib/authFetch";
import type { Review, CreateReviewDto } from "@/types/marketplace";

/* ---------------------------------- */
/* Review Service */
/* ---------------------------------- */

/**
 * Submit or update a review for a store
 * Requires authentication
 * @param reviewData - Review data with storeId, rating, and comment
 */
export async function submitReview(
  reviewData: CreateReviewDto,
): Promise<Review> {
  return request("marketplace/reviews", {
    method: "POST",
    body: JSON.stringify(reviewData),
  }) as Promise<Review>;
}

/**
 * Delete a user's review for a specific store
 * Requires authentication
 * @param storeId - The store ID to delete review for
 */
export async function deleteReview(storeId: string): Promise<void> {
  return request(`marketplace/reviews/${storeId}`, {
    method: "DELETE",
  }) as Promise<void>;
}

/**
 * Validate review data before submission
 */
export function validateReview(data: CreateReviewDto): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.storeId || data.storeId.trim() === "") {
    errors.push("Store ID is required");
  }

  if (!data.rating || data.rating < 1 || data.rating > 5) {
    errors.push("Rating must be between 1 and 5");
  }

  if (!data.comment || data.comment.trim().length < 10) {
    errors.push("Review comment must be at least 10 characters");
  }

  if (data.comment && data.comment.length > 500) {
    errors.push("Review comment must be less than 500 characters");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
