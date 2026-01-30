import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useThemeColor } from "@/hooks/use-theme-color";

/* -------------------- Loading Screen -------------------- */

function LoadingScreen() {
  const primary = useThemeColor({}, "brandPrimary");

  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const animate = (dot: typeof dot1, delay: number) => {
      dot.value = withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration: 400 }),
          -1,
          true, // reverse
        ),
      );
    };

    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  const style1 = useAnimatedStyle(() => ({
    transform: [{ translateY: -10 * dot1.value }],
    backgroundColor: primary,
  }));

  const style2 = useAnimatedStyle(() => ({
    transform: [{ translateY: -10 * dot2.value }],
    backgroundColor: primary,
  }));

  const style3 = useAnimatedStyle(() => ({
    transform: [{ translateY: -10 * dot3.value }],
    backgroundColor: primary,
  }));

  return (
    <View style={styles.loadingContainer}>
      <Image
        source={require("@/assets/images/icon.png")}
        style={styles.logo}
        contentFit="contain"
      />
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, style1]} />
        <Animated.View style={[styles.dot, style2]} />
        <Animated.View style={[styles.dot, style3]} />
      </View>
    </View>
  );
}

/* -------------------- Root Navigator -------------------- */

function RootNavigator() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Animated.Text style={{ fontSize: 24 }}>Hello</Animated.Text>
    </View>
  );
}

/* -------------------- Styles -------------------- */

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
