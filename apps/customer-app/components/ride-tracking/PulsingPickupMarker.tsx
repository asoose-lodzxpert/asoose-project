/**
 * PulsingPickupMarker
 *
 * Renders the pickup location pin with a live pulsing ring — provides the
 * "Driver is arriving" UX similar to Uber's glowing pickup dot.
 *
 * Animation: The ring scales from 1x to 1.8x while fading from 70% to 0%
 * opacity, then loops. This runs entirely on the native thread via
 * useNativeDriver=true for zero JS-thread cost.
 *
 * Pass `pulse={false}` to show a static pin (e.g. during IN_PROGRESS state).
 */
import { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  coordinate: { latitude: number; longitude: number };
  /** When true the pulsing ring plays (default: true) */
  pulse?: boolean;
};

export default function PulsingPickupMarker({
  coordinate,
  pulse = true,
}: Props) {
  const success = useThemeColor({}, "statusSuccess");

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!pulse) {
      // Stop any running animation and reset to static state
      loopRef.current?.stop();
      scaleAnim.setValue(1);
      opacityAnim.setValue(0.7);
      return;
    }

    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.9,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 0, // instant reset at end of cycle
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.7,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
      loopRef.current = null;
    };
  }, [pulse, scaleAnim, opacityAnim]);

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      // tracksViewChanges disabled — the marker position never changes,
      // only the native Animated values do.
      tracksViewChanges={false}
    >
      <View style={styles.container}>
        {/* Expanding pulsing ring (native animation) */}
        <Animated.View
          style={[
            styles.pulse,
            {
              borderColor: success,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
        {/* Static inner pin */}
        <View style={[styles.pin, { backgroundColor: success }]}>
          <IconSymbol name="mappin" size={11} color="#fff" />
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
  },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
});
