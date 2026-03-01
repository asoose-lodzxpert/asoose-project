import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  ImageBackground,
  StyleSheet,
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import type { Banner } from "@/services/banner.service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = 140;

/* ------------------------------------------------------------------ */
/* Shimmer skeleton                                                    */
/* ------------------------------------------------------------------ */
function BannerSkeleton() {
  const bg = useThemeColor({}, "surfaceSubtle");
  const shimmer = useThemeColor({}, "borderDefault");

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-CARD_WIDTH, CARD_WIDTH],
  });

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bg, marginHorizontal: 16, overflow: "hidden" },
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: shimmer,
            opacity: 0.35,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Single banner card                                                  */
/* ------------------------------------------------------------------ */
function BannerCard({ item }: { item: Banner }) {
  const primary = useThemeColor({}, "brandPrimary");

  const content = (
    <View style={styles.cardContent}>
      <ThemedText style={styles.title} numberOfLines={2}>
        {item.title}
      </ThemedText>
      {!!item.subtitle && (
        <ThemedText style={styles.subtitle} numberOfLines={2}>
          {item.subtitle}
        </ThemedText>
      )}
      {!!item.buttonText && (
        <View style={[styles.pill, { backgroundColor: primary }]}>
          <ThemedText style={styles.pillText}>{item.buttonText}</ThemedText>
        </View>
      )}
    </View>
  );

  if (item.image) {
    return (
      <ImageBackground
        source={{ uri: item.image }}
        style={[styles.card, { marginHorizontal: 0 }]}
        imageStyle={styles.cardImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        {content}
      </ImageBackground>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { marginHorizontal: 0, backgroundColor: primary + "18" },
      ]}
    >
      {content}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Main PromoBanner component                                          */
/* ------------------------------------------------------------------ */
interface PromoBannerProps {
  banners: Banner[];
  loading?: boolean;
}

export function PromoBanner({ banners, loading = false }: PromoBannerProps) {
  const primary = useThemeColor({}, "brandPrimary");
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Banner>>(null);

  // Auto-scroll every 4 seconds
  useEffect(() => {
    if (!banners.length) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % banners.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (loading) return <BannerSkeleton />;
  if (!banners.length) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToAlignment="center"
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ width: CARD_WIDTH }}>
            <BannerCard item={item} />
          </View>
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12),
          );
          setActiveIndex(index);
        }}
      />

      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: primary,
                  opacity: i === activeIndex ? 1 : 0.25,
                  width: i === activeIndex ? 16 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  card: {
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  cardImage: { borderRadius: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderRadius: 16,
  },
  cardContent: { padding: 16, gap: 4 },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
  },
  pillText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: { height: 6, borderRadius: 3 },
});
