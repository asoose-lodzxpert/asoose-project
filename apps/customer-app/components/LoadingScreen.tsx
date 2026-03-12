import React, { useEffect, useRef } from "react";
import { View, Image, Animated, StyleSheet } from "react-native";

const icon = require("../assets/images/asoose-icon.png");

export default function LoadingScreen() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    interface AnimateFn {
      (dot: Animated.Value, delay: number): void;
    }

    const animate: AnimateFn = (dot, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: -10,
            duration: 300,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.container}>
      <Image source={icon} style={styles.icon} />
      <View style={styles.dotsRow}>
        <Animated.View
          style={[styles.dot, { transform: [{ translateY: dot1 }] }]}
        />
        <Animated.View
          style={[styles.dot, { transform: [{ translateY: dot2 }] }]}
        />
        <Animated.View
          style={[styles.dot, { transform: [{ translateY: dot3 }] }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: 24,
    resizeMode: "contain",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    height: 24,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#222",
    marginHorizontal: 6,
  },
});
