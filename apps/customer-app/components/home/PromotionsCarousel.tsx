import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ImageBackground,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";

export type Promotion = {
  id: string;
  title: string;
  code?: string;
  actionText?: string;
  textColor?: string;

  iconName?: IconSymbolName;
  iconImage?: any;

  backgroundImage?: any;
  onPress?: () => void;
};

const CARD_WIDTH = 320;
const AUTO_SCROLL_INTERVAL = 4000;

export function PromotionsCarousel({ data }: { data: Promotion[] }) {
  const primary = useThemeColor({}, "brandPrimary");
  const textDefault = useThemeColor({}, "textPrimary");
  const surface = useThemeColor({}, "surfaceBackground");

  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<Animated.FlatList<Promotion>>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const isInteracting = useRef(false);

  /** -------------------- */
  /** Auto scroll logic */
  /** -------------------- */
  useEffect(() => {
    startAutoScroll();
    return stopAutoScroll;
  }, [activeIndex]);

  function startAutoScroll() {
    if (autoScrollTimer.current || isInteracting.current) return;

    autoScrollTimer.current = setTimeout(() => {
      const nextIndex = (activeIndex + 1) % data.length;
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * CARD_WIDTH,
        animated: true,
      });
      setActiveIndex(nextIndex);
      autoScrollTimer.current = null;
    }, AUTO_SCROLL_INTERVAL);
  }

  function stopAutoScroll() {
    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
    setActiveIndex(index);
    isInteracting.current = false;
  }

  return (
    <View>
      <Animated.FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => {
          isInteracting.current = true;
          stopAutoScroll();
        }}
        onMomentumScrollEnd={onScrollEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * CARD_WIDTH,
            index * CARD_WIDTH,
            (index + 1) * CARD_WIDTH,
          ];

          const translateX = scrollX.interpolate({
            inputRange,
            outputRange: [-12, 0, 12],
          });

          const color = item.textColor ?? "#000";

          const Content = (
            <Animated.View
              style={[styles.content, { transform: [{ translateX }] }]}
            >
              <View style={styles.row}>
                {item.iconImage && (
                  <Image source={item.iconImage} style={styles.iconImage} />
                )}

                {item.iconName && !item.iconImage && (
                  <IconSymbol name={item.iconName} size={34} color={color} />
                )}

                <View style={styles.textWrap}>
                  <ThemedText style={[styles.title, { color }]}>
                    {item.title}
                  </ThemedText>

                  {item.code && (
                    <ThemedText style={[styles.code, { color }]}>
                      Use code:{" "}
                      <ThemedText style={{ fontWeight: "700", color }}>
                        {item.code}
                      </ThemedText>
                    </ThemedText>
                  )}
                </View>

                <Pressable
                  onPress={item.onPress}
                  style={[styles.button, { backgroundColor: surface }]}
                >
                  <ThemedText style={styles.buttonText}>
                    {item.actionText ?? "Order Now"}
                  </ThemedText>
                </Pressable>
              </View>
            </Animated.View>
          );

          return item.backgroundImage ? (
            <ImageBackground
              source={item.backgroundImage}
              style={styles.card}
              imageStyle={{ borderRadius: 12 }}
            >
              <LinearGradient
                colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0.05)"]}
                style={StyleSheet.absoluteFill}
              />
              {Content}
            </ImageBackground>
          ) : (
            <View style={[styles.card, { backgroundColor: primary }]}>
              {Content}
            </View>
          );
        }}
      />

      {/* Pagination dots */}
      <View style={styles.dots}>
        {data.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === activeIndex ? "#FFF" : textDefault,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */
const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginRight: 16,
    borderRadius: 12,
    padding: 18,
    overflow: "hidden",
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconImage: {
    width: 36,
    height: 36,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  code: {
    marginTop: 4,
    fontSize: 13,
    opacity: 0.9,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonText: {
    fontWeight: "700",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.8,
  },
});
