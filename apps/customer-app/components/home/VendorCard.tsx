import { View, StyleSheet, Pressable, Image } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Vendor } from "@/types/home";

/* ---------------------------------- */
/* Assets (placeholders) */
/* ---------------------------------- */
const COVER_PLACEHOLDER = require("@/assets/placeholders/store-cover.jpg");
const LOGO_PLACEHOLDER = require("@/assets/placeholders/store-logo.avif");

type Props = {
  item: Vendor;
};

export function VendorCard({ item }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const card = useThemeColor({}, "surfaceCard");

  const rating = typeof item.rating === "number" ? item.rating : 0;
  const deliveryText = item.deliveryTime || item.eta || "30-45 mins";
  const tags = item.tags?.length
    ? item.tags
    : item.type
      ? [item.type.toString().toLowerCase()]
      : [];

  const coverUri = item.cover || item.image || null;
  const logoUri = item.logo || item.image || null;

  function handlePress() {
    // Future: navigate to vendor details
  }

  return (
    <Pressable
      style={[styles.card, { backgroundColor: card }]}
      onPress={handlePress}
    >
      {/* ---------------- Top Section ---------------- */}
      <View style={styles.top}>
        <Image
          source={coverUri ? { uri: coverUri } : COVER_PLACEHOLDER}
          style={styles.cover}
          resizeMode="cover"
        />

        {typeof item.discount === "number" && item.discount > 0 && (
          <View style={[styles.discount, { backgroundColor: primary }]}>
            <ThemedText style={styles.discountText}>
              {item.discount}% OFF
            </ThemedText>
          </View>
        )}
      </View>

      {/* Store Avatar */}
      <View style={styles.avatarWrap}>
        <Image
          source={logoUri ? { uri: logoUri } : LOGO_PLACEHOLDER}
          style={styles.avatar}
          resizeMode="cover"
        />
      </View>

      {/* ---------------- Bottom Section ---------------- */}
      <View style={styles.bottom}>
        <ThemedText style={styles.name}>{item.name}</ThemedText>

        <View style={styles.meta}>
          <IconSymbol name="star.fill" size={14} color={primary} />
          <ThemedText>{rating.toFixed(1)}</ThemedText>
          <ThemedText style={{ color: textMuted }}>• {deliveryText}</ThemedText>
        </View>

        {tags.length ? (
          <ThemedText style={styles.tags}>{tags.join(" • ")}</ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */
const CARD_RADIUS = 12;
const COVER_HEIGHT = 120;
const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD_RADIUS,
    marginBottom: 16,
    overflow: "hidden",
    minWidth: 300,
  },

  top: {
    height: COVER_HEIGHT,
  },
  cover: {
    width: "100%",
    height: "100%",
  },

  discount: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  discountText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "700",
  },

  avatarWrap: {
    position: "absolute",
    top: COVER_HEIGHT - AVATAR_SIZE / 2,
    left: 14,
    backgroundColor: "#FFF",
    borderRadius: AVATAR_SIZE / 2 + 2,
    padding: 2,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },

  bottom: {
    padding: 14,
    paddingTop: AVATAR_SIZE / 2 + 10,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    alignItems: "center",
  },
  tags: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 13,
  },
});
