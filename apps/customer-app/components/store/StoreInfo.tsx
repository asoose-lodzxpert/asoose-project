import React from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import type { StoreData, Review } from "@/types/store-types";
import { useThemeColor } from "@/hooks/use-theme-color";

interface StoreInfoProps {
  store: StoreData;
  reviews: Review[];
  loading?: boolean;
}

export function StoreInfo({ store, reviews, loading = false }: StoreInfoProps) {
  const isRestaurant = store.type === "RESTAURANT";
  const cardBg = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const text = useThemeColor({}, "textPrimary");
  const muted = useThemeColor({}, "textMuted");
  const avatarBg = useThemeColor({}, "surfaceSubtle");
  const skeletonColor = useThemeColor({}, "surfaceSubtle");
  const starColor = useThemeColor({}, "statusSuccess");

  const renderReview = (review: Review, idx: number) => (
    <View
      key={review.id}
      style={[
        styles.reviewCard,
        { backgroundColor: cardBg, borderColor: border },
      ]}
    >
      <View style={styles.reviewHeader}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <IconSymbol name="star" size={16} color={starColor} />
            <ThemedText style={[styles.reviewRating, { color: text }]}>
              {review.rating}
            </ThemedText>
          </View>
          <ThemedText style={[styles.reviewerName, { color: muted }]}>
            User {idx + 1}
          </ThemedText>
        </View>
      </View>
      <ThemedText style={[styles.reviewComment, { color: text }]}>
        {review.comment}
      </ThemedText>
    </View>
  );

  const renderSkeleton = (_: any, idx: number) => (
    <View
      key={idx}
      style={[
        styles.reviewCard,
        { backgroundColor: cardBg, borderColor: border, opacity: 0.5 },
      ]}
    >
      <View style={styles.reviewHeader}>
        <View style={[styles.avatar, { backgroundColor: skeletonColor }]} />
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <View
              style={{
                width: 40,
                height: 12,
                backgroundColor: skeletonColor,
                borderRadius: 4,
              }}
            />
          </View>
          <View
            style={{
              width: 60,
              height: 10,
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
      <ThemedText style={styles.infoTitle}>
        {isRestaurant ? "About the Restaurant" : "About the Store"}
      </ThemedText>
      {loading ? (
        <View
          style={{
            width: "80%",
            height: 16,
            backgroundColor: skeletonColor,
            borderRadius: 4,
            marginBottom: 16,
          }}
        />
      ) : (
        <ThemedText style={[styles.infoText, { color: text }]}>
          {store.address}
        </ThemedText>
      )}
      <ThemedText style={[styles.infoTitle, { color: text }]}>
        Reviews
      </ThemedText>
      {loading ? (
        Array.from({ length: 3 }).map(renderSkeleton)
      ) : reviews.length === 0 ? (
        <ThemedText style={[styles.noReviewsText, { color: muted }]}>
          No reviews yet. Be the first to review!
        </ThemedText>
      ) : (
        reviews.map(renderReview)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  infoContainer: {
    flex: 1,
    padding: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f3f3",
    marginRight: 10,
  },
  reviewerName: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  reviewRating: {
    fontSize: 15,
    fontWeight: "bold",
    marginLeft: 4,
    color: "#222",
  },
  reviewComment: {
    fontSize: 15,
    color: "#333",
    marginTop: 2,
  },
  noReviewsText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingVertical: 20,
  },
});
