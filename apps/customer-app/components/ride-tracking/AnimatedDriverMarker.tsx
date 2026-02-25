/**
 * AnimatedDriverMarker
 *
 * Renders the driver's car icon on the map with:
 *  - Smooth position transitions via animateMarkerToCoordinate (native, zero JS overhead).
 *  - Smooth heading rotation that takes the shortest angular path.
 *  - GPS jitter suppression (moves < 3 m are ignored).
 *  - tracksViewChanges disabled after first render for maximum performance
 *    (react-native-maps re-renders the native view on every JS render otherwise).
 *
 * Usage: drop this inside a <MapView> wherever the static <Marker> for the
 * driver used to be. Pass the `location` from RideContext.driverLocation.
 */
import { useEffect } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { DriverLocation } from "@/types/ride";
import { useDriverMarkerAnimation } from "./hooks/useDriverMarkerAnimation";

type Props = {
  location: DriverLocation;
};

export default function AnimatedDriverMarker({ location }: Props) {
  const primary = useThemeColor({}, "brandPrimary");

  const { markerRef, rotationAnim, animate, initialized } =
    useDriverMarkerAnimation();

  // Trigger animation on every location change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    animate(location);
  }, [location.latitude, location.longitude, location.heading]);

  // Interpolate the Animated.Value to a CSS-style degree string.
  // Using a wide inputRange so the value never falls outside the mapped range
  // even after many accumulated deltas (the value walks up/down continually).
  const rotateStr = rotationAnim.interpolate({
    inputRange: [-720, 0, 720],
    outputRange: ["-720deg", "0deg", "720deg"],
    extrapolate: "extend",
  });

  return (
    <Marker
      ref={markerRef}
      // Initial coordinate — after first render, animateMarkerToCoordinate takes over.
      coordinate={{
        latitude: location.latitude,
        longitude: location.longitude,
      }}
      flat
      anchor={{ x: 0.5, y: 0.5 }}
      // Stop asking the native view to re-render after the marker has been
      // positioned — this is the single most impactful perf flag for map markers.
      tracksViewChanges={!initialized.current}
    >
      <Animated.View style={{ transform: [{ rotate: rotateStr }] }}>
        <View style={[styles.carMarker, { backgroundColor: primary }]}>
          <IconSymbol name="car.fill" size={15} color="#fff" />
        </View>
      </Animated.View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  carMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});
