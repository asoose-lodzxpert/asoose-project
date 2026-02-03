import React from "react";
import { View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { StoreData } from "@/types/store-types";

export function StoreHero({
  store,
  onBack,
  onShare,
  loading = false,
}: {
  store: StoreData;
  onBack?: () => void;
  onShare?: () => void;
  loading?: boolean;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const cardBg = useThemeColor({}, "surfaceCard");
  const text = useThemeColor({}, "textPrimary");
  const skeleton = useThemeColor({}, "surfaceSubtle");
  const overlayBg = "rgba(0,0,0,0.5)";
  const isRestaurant = store.type === "RESTAURANT";
  const cuisines = isRestaurant ? ["Pizza", "Italian"] : ["General Store"];

  return (
    <View style={styles.heroContainer}>
      {loading ? (
        <View style={[styles.heroImage, { backgroundColor: skeleton }]} />
      ) : (
        <Image source={{ uri: store.image }} style={styles.heroImage} />
      )}
      <TouchableOpacity
        style={[styles.navIcon, { backgroundColor: cardBg }]}
        onPress={onBack}
        disabled={loading}
      >
        <IconSymbol name="chevron.left" size={24} color={primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navIconRight, { backgroundColor: cardBg }]}
        onPress={onShare}
        disabled={loading}
      >
        <IconSymbol name="share" size={24} color={primary} />
      </TouchableOpacity>
      <View style={[styles.logoOverlay, { backgroundColor: cardBg }]}>
        {loading ? (
          <View style={[styles.logo, { backgroundColor: skeleton }]} />
        ) : (
          <Image source={{ uri: store.image }} style={styles.logo} />
        )}
      </View>
      <View style={[styles.detailsOverlay, { backgroundColor: overlayBg }]}>
        {loading ? (
          <>
            <View
              style={{
                width: 120,
                height: 24,
                backgroundColor: skeleton,
                borderRadius: 6,
                marginBottom: 4,
              }}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 2,
              }}
            >
              <View
                style={{
                  width: 60,
                  height: 14,
                  backgroundColor: skeleton,
                  borderRadius: 4,
                  marginLeft: 4,
                }}
              />
            </View>
            <View
              style={{
                width: 180,
                height: 14,
                backgroundColor: skeleton,
                borderRadius: 4,
              }}
            />
          </>
        ) : (
          <>
            <ThemedText style={[styles.restaurantName, { color: text }]}>
              {store.name}
            </ThemedText>
            <View style={styles.ratingRow}>
              <IconSymbol name="star" size={16} color={primary} />
              <ThemedText style={[styles.ratingText, { color: text }]}>
                {store.rating} ({store.reviews.length} reviews)
              </ThemedText>
            </View>
            <ThemedText style={[styles.metadataText, { color: text }]}>
              {cuisines.join(", ")} • {store.deliveryTime} • Free delivery
            </ThemedText>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    height: "40%",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  navIcon: {
    position: "absolute",
    top: 50,
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
  navIconRight: {
    position: "absolute",
    top: 50,
    right: 16,
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
    top: 100,
    left: 16,
    borderRadius: 30,
    padding: 4,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  detailsOverlay: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 12,
    borderRadius: 8,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 4,
  },
  metadataText: {
    fontSize: 14,
  },
});
