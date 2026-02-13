import React from "react";
import { ScrollView, View, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { StoreData, Review } from "@/types/store-types";
import { useThemeColor } from "@/hooks/use-theme-color";

interface StoreInfoProps {
  store: StoreData;
  reviews: Review[];
  loading?: boolean;
  onWriteReview?: () => void;
}

export function StoreInfo({
  store,
  reviews,
  loading = false,
  onWriteReview,
}: StoreInfoProps) {
  const isRestaurant = store.type === "RESTAURANT";
  const cardBg = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const text = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const muted = useThemeColor({}, "textMuted");
  const avatarBg = useThemeColor({}, "surfaceSubtle");
  const skeletonColor = useThemeColor({}, "surfaceSubtle");
  const starColor = "#F59E0B";
  const primary = useThemeColor({}, "brandPrimary");

  const renderReview = (review: Review, idx: number) => (
    <View
      key={review.id}
      style={[
        styles.reviewCard,
        { backgroundColor: cardBg, borderColor: border },
      ]}
    >
      <View style={styles.reviewHeader}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <IconSymbol name="person.fill" size={16} color={muted} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.reviewerName, { color: text }]}>
            {review.userName ?? `Customer ${idx + 1}`}
          </ThemedText>
          <View
            style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <IconSymbol
                key={i}
                name={i < review.rating ? "star.fill" : "star"}
                size={12}
                color={i < review.rating ? starColor : border}
              />
            ))}
            <ThemedText
              style={[
                styles.reviewRating,
                { color: textSecondary, marginLeft: 6 },
              ]}
            >
              {review.rating}.0
            </ThemedText>
          </View>
        </View>
        {review.createdAt && (
          <ThemedText style={[styles.reviewDate, { color: muted }]}>
            {new Date(review.createdAt).toLocaleDateString()}
          </ThemedText>
        )}
      </View>
      {review.comment && (
        <ThemedText style={[styles.reviewComment, { color: text }]}>
          {review.comment}
        </ThemedText>
      )}
    </View>
  );

  const renderSkeleton = (_: any, idx: number) => (
    <View
      key={idx}
      style={[
        styles.reviewCard,
        { backgroundColor: cardBg, borderColor: border },
      ]}
    >
      <View style={styles.reviewHeader}>
        <View style={[styles.avatar, { backgroundColor: skeletonColor }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View
            style={{
              width: 100,
              height: 14,
              backgroundColor: skeletonColor,
              borderRadius: 4,
            }}
          />
          <View
            style={{
              width: 80,
              height: 12,
              backgroundColor: skeletonColor,
              borderRadius: 4,
            }}
          />
        </View>
      </View>
      <View
        style={{
          width: "100%",
          height: 14,
          backgroundColor: skeletonColor,
          borderRadius: 4,
          marginTop: 8,
        }}
      />
    </View>
  );

  return (
    <ScrollView style={styles.infoContainer}>
      {/* About Section */}
      <View
        style={[
          styles.section,
          { backgroundColor: cardBg, borderColor: border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <IconSymbol
            name={isRestaurant ? "fork.knife" : "basket.fill"}
            size={20}
            color={primary}
          />
          <ThemedText style={[styles.sectionTitle, { color: text }]}>
            About Store
          </ThemedText>
        </View>

        {loading ? (
          <View style={{ gap: 8 }}>
            <View style={[styles.skeletonLine, { width: "100%" }]} />
            <View style={[styles.skeletonLine, { width: "80%" }]} />
          </View>
        ) : (
          <>
            <View style={styles.infoRow}>
              <IconSymbol
                name="location.fill"
                size={16}
                color={textSecondary}
              />
              <ThemedText style={[styles.infoText, { color: text }]}>
                {store.address || "Address not available"}
              </ThemedText>
            </View>

            <View style={styles.infoRow}>
              <IconSymbol name="clock.fill" size={16} color={textSecondary} />
              <ThemedText style={[styles.infoText, { color: text }]}>
                Delivery: {store.deliveryTime || "30-45 mins"}
              </ThemedText>
            </View>

            <View style={styles.infoRow}>
              <IconSymbol name="tag.fill" size={16} color={textSecondary} />
              <ThemedText style={[styles.infoText, { color: text }]}>
                Type: Store
              </ThemedText>
            </View>
          </>
        )}
      </View>

      {/* Reviews Section */}
      <View style={styles.reviewsSection}>
        <View style={styles.reviewsHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <IconSymbol name="star.fill" size={20} color={starColor} />
            <ThemedText style={[styles.sectionTitle, { color: text }]}>
              Reviews
            </ThemedText>
            {!loading && reviews.length > 0 && (
              <View style={[styles.badge, { backgroundColor: primary }]}>
                <ThemedText style={styles.badgeText}>
                  {reviews.length}
                </ThemedText>
              </View>
            )}
          </View>

          {onWriteReview && !loading && (
            <TouchableOpacity
              style={[styles.writeReviewButton, { backgroundColor: primary }]}
              onPress={onWriteReview}
            >
              <IconSymbol name="pencil" size={16} color="#fff" />
              <ThemedText style={styles.writeReviewText}>Write</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          Array.from({ length: 3 }).map(renderSkeleton)
        ) : reviews.length === 0 ? (
          <View
            style={[
              styles.emptyReviews,
              { backgroundColor: cardBg, borderColor: border },
            ]}
          >
            <IconSymbol name="message" size={48} color={muted} />
            <ThemedText style={[styles.emptyReviewsTitle, { color: text }]}>
              No reviews yet
            </ThemedText>
            <ThemedText style={[styles.emptyReviewsText, { color: muted }]}>
              Be the first to share your experience!
            </ThemedText>
          </View>
        ) : (
          reviews.map(renderReview)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  infoContainer: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  reviewsSection: {
    marginBottom: 24,
  },
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  writeReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  writeReviewText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: "600",
  },
  reviewRating: {
    fontSize: 12,
    fontWeight: "500",
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  emptyReviews: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyReviewsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  emptyReviewsText: {
    fontSize: 14,
    textAlign: "center",
  },
  skeletonLine: {
    height: 14,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
  },
});
