import React, { useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { submitReview, validateReview } from "@/services/review.service";
import type { CreateReviewDto } from "@/types/marketplace";

type ReviewModalProps = {
  visible: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  onSuccess?: () => void;
};

export function ReviewModal({
  visible,
  onClose,
  storeId,
  storeName,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primary = useThemeColor({}, "brandPrimary");
  const textColor = useThemeColor({}, "textPrimary");
  const mutedColor = useThemeColor({}, "textMuted");
  const cardBg = useThemeColor({}, "surfaceCard");
  const borderColor = useThemeColor({}, "borderDefault");

  const handleSubmit = async () => {
    const reviewData: CreateReviewDto = {
      storeId,
      rating,
      comment: comment.trim(),
    };

    const validation = validateReview(reviewData);
    if (!validation.valid) {
      setError(validation.errors.join(". "));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await submitReview(reviewData);
      setComment("");
      setRating(5);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setComment("");
    setRating(5);
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <ThemedView style={[styles.container, { backgroundColor: cardBg }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <ThemedText style={styles.title}>Write a Review</ThemedText>
              <TouchableOpacity onPress={handleClose} disabled={loading}>
                <IconSymbol name="xmark" size={28} color={mutedColor} />
              </TouchableOpacity>
            </View>

            {/* Store Name */}
            <ThemedText style={[styles.storeName, { color: mutedColor }]}>
              {storeName}
            </ThemedText>

            {/* Rating Stars */}
            <View style={styles.section}>
              <ThemedText style={styles.label}>Rating</ThemedText>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    disabled={loading}
                    style={styles.starButton}
                  >
                    <IconSymbol
                      name={star <= rating ? "star.fill" : "star"}
                      size={36}
                      color={star <= rating ? "#FFC107" : mutedColor}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <ThemedText style={[styles.ratingText, { color: mutedColor }]}>
                {rating === 5
                  ? "Excellent"
                  : rating === 4
                    ? "Good"
                    : rating === 3
                      ? "Average"
                      : rating === 2
                        ? "Below Average"
                        : "Poor"}
              </ThemedText>
            </View>

            {/* Comment */}
            <View style={styles.section}>
              <ThemedText style={styles.label}>
                Your Review (min 10 characters)
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: cardBg,
                    borderColor: borderColor,
                    color: textColor,
                  },
                ]}
                placeholder="Share your experience with this store..."
                placeholderTextColor={mutedColor}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={6}
                maxLength={500}
                editable={!loading}
                textAlignVertical="top"
              />
              <ThemedText style={[styles.charCount, { color: mutedColor }]}>
                {comment.length}/500
              </ThemedText>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: primary },
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.submitButtonText}>
                  Submit Review
                </ThemedText>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <ThemedText
                style={[styles.cancelButtonText, { color: mutedColor }]}
              >
                Cancel
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  storeName: {
    fontSize: 16,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
  },
  charCount: {
    textAlign: "right",
    fontSize: 12,
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    padding: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
