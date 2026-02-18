import React from "react";
import { View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { StoreData } from "@/types/store-types";

export function StoreHero({
  store,
  onBack,
  loading = false,
}: {
  store: StoreData;
  onBack?: () => void;
  loading?: boolean;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const cardBg = useThemeColor({}, "surfaceCard");
  const text = useThemeColor({}, "textPrimary");
  const skeleton = useThemeColor({}, "surfaceSubtle");
  const border = useThemeColor({}, "borderDefault");
  const overlayBg = "rgba(0,0,0,0.6)";

  const isRestaurant = store.type === "RESTAURANT";
  const bannerImage = store.banner || store.image;
  const logoImage = store.image;
  const hasImage = !!bannerImage;
  const hasLogo = !!logoImage;

  return (
    <View style={styles.heroContainer}>
      {loading || !hasImage ? (
        <View style={[styles.heroImage, { backgroundColor: skeleton }]}>
          <IconSymbol
            name={isRestaurant ? "fork.knife" : "basket.fill"}
            size={64}
            color={border}
          />
        </View>
      ) : (
        <Image
          source={{ uri: bannerImage }}
          style={styles.heroImage}
          resizeMode="cover"
        />
      )}

      <TouchableOpacity
        style={[styles.navIcon, { backgroundColor: cardBg }]}
        onPress={onBack}
        disabled={loading}
      >
        <IconSymbol name="chevron.left" size={24} color={primary} />
      </TouchableOpacity>

      <View
        style={[
          styles.logoOverlay,
          { backgroundColor: cardBg, borderColor: border },
        ]}
      >
        {loading || !hasLogo ? (
          <View
            style={[
              styles.logo,
              {
                backgroundColor: skeleton,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <IconSymbol
              name={isRestaurant ? "fork.knife" : "basket.fill"}
              size={32}
              color={border}
            />
          </View>
        ) : (
          <Image
            source={{ uri: logoImage }}
            style={styles.logo}
            resizeMode="cover"
          />
        )}
      </View>

      <View style={[styles.detailsOverlay, { backgroundColor: overlayBg }]}>
        {loading ? (
          <>
            <View
              style={[
                styles.skeletonLine,
                { width: "60%", height: 24, marginBottom: 8 },
              ]}
            />
            <View
              style={[
                styles.skeletonLine,
                { width: "40%", height: 16, marginBottom: 4 },
              ]}
            />
            <View style={[styles.skeletonLine, { width: "70%", height: 14 }]} />
          </>
        ) : (
          <>
            <ThemedText style={[styles.storeName, { color: "#FFF" }]}>
              {store.name}
            </ThemedText>

            <View style={styles.ratingRow}>
              <IconSymbol name="star.fill" size={16} color="#F59E0B" />
              <ThemedText style={[styles.ratingText, { color: "#FFF" }]}>
                {store.rating > 0 ? store.rating.toFixed(1) : "New"}
              </ThemedText>
              {store.reviews?.length > 0 && (
                <ThemedText style={[styles.reviewCount, { color: "#E5E7EB" }]}>
                  ({store.reviews.length}{" "}
                  {store.reviews.length === 1 ? "review" : "reviews"})
                </ThemedText>
              )}
            </View>

            <View style={styles.metadataRow}>
              <View style={styles.metadataItem}>
                <IconSymbol name="clock.fill" size={14} color="#E5E7EB" />
                <ThemedText style={[styles.metadataText, { color: "#E5E7EB" }]}>
                  {store.deliveryTime || "30-45 mins"}
                </ThemedText>
              </View>

              <View style={styles.metadataItem}>
                <IconSymbol name="banknote.fill" size={14} color="#E5E7EB" />
                <ThemedText style={[styles.metadataText, { color: "#E5E7EB" }]}>
                  Store
                </ThemedText>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    height: 200,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  navIcon: {
    position: "absolute",
    top: 16,
    left: 16,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  logoOverlay: {
    position: "absolute",
    top: 70,
    left: 16,
    borderRadius: 35,
    padding: 2,
    borderWidth: 3,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  detailsOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  storeName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
  },
  reviewCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metadataText: {
    fontSize: 13,
    fontWeight: "500",
  },
  skeletonLine: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
  },
});
