import { forwardRef } from "react";
import {
  StyleSheet,
  View,
  Platform,
  Dimensions,
  Pressable,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useMapStyle } from "@/hooks/useMapStyle";
import { Ride } from "@/types/ride"; // assuming you have a Ride type

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type TrackingMapProps = {
  currentRide: Ride | null;
  driverLocation: { latitude: number; longitude: number } | null;
  userLocation: { latitude: number; longitude: number } | null;
  routeCoords: { latitude: number; longitude: number }[];
  driverRouteCoords: { latitude: number; longitude: number }[];
  socketConnected: boolean;
  onRefresh: () => void;
  onBack?: () => void;
};

const TrackingMap = forwardRef<MapView, TrackingMapProps>(
  (
    {
      currentRide,
      driverLocation,
      userLocation,
      routeCoords,
      driverRouteCoords,
      socketConnected,
      onRefresh,
      onBack,
    },
    ref,
  ) => {
    const mapStyle = useMapStyle();
    const primary = useThemeColor({}, "brandPrimary");
    const surface = useThemeColor({}, "surfaceBackground");
    const success = useThemeColor({}, "statusSuccess");
    const danger = useThemeColor({}, "statusError");
    const textPrimary = useThemeColor({}, "textPrimary");

    return (
      <>
        <MapView
          ref={ref}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          customMapStyle={mapStyle}
          mapPadding={{
            top: 20,
            right: 0,
            bottom: SCREEN_HEIGHT * 0.44,
            left: 0,
          }}
          initialRegion={{
            latitude: currentRide?.pickupAddress?.lat ?? 0,
            longitude: currentRide?.pickupAddress?.lng ?? 0,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={currentRide?.status === "IN_PROGRESS"}
          showsMyLocationButton={false}
          showsCompass={false}
          rotateEnabled={false}
        >
          {currentRide?.pickupAddress && (
            <Marker
              coordinate={{
                latitude: currentRide.pickupAddress.lat,
                longitude: currentRide.pickupAddress.lng,
              }}
              title="Pickup"
            >
              <View style={[styles.mapPin, { backgroundColor: success }]}>
                <IconSymbol name="mappin" size={11} color="#fff" />
              </View>
            </Marker>
          )}

          {currentRide?.dropoffAddress && (
            <Marker
              coordinate={{
                latitude: currentRide.dropoffAddress.lat,
                longitude: currentRide.dropoffAddress.lng,
              }}
              title="Dropoff"
            >
              <View style={[styles.mapPin, { backgroundColor: danger }]}>
                <IconSymbol name="mappin" size={11} color="#fff" />
              </View>
            </Marker>
          )}

          {driverLocation && (
            <Marker
              coordinate={driverLocation}
              title="Driver"
              flat
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.carMarker, { backgroundColor: primary }]}>
                <IconSymbol name="car.fill" size={15} color="#fff" />
              </View>
            </Marker>
          )}

          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor={primary + "90"}
              strokeWidth={3}
            />
          )}

          {driverRouteCoords.length > 0 && (
            <Polyline
              coordinates={driverRouteCoords}
              strokeColor={primary}
              strokeWidth={3}
              lineDashPattern={[8, 5]}
            />
          )}
        </MapView>

        {/* Floating top bar */}
        <View style={styles.topBar} pointerEvents="box-none">
          <View
            style={[
              styles.topRow,
              { paddingTop: Platform.OS === "android" ? 40 : 10 },
            ]}
          >
            <Pressable
              onPress={onBack}
              style={[styles.iconBtn, { backgroundColor: surface }]}
            >
              <IconSymbol name="arrow.left" size={20} color={textPrimary} />
            </Pressable>

            <View style={[styles.livePill, { backgroundColor: surface }]}>
              <View
                style={[
                  styles.liveDot,
                  { backgroundColor: socketConnected ? success : danger },
                ]}
              />
              <ThemedText
                type="caption"
                style={{ fontWeight: "700", letterSpacing: 0.5 }}
              >
                {socketConnected ? "LIVE" : "RECONNECTING"}
              </ThemedText>
            </View>

            <Pressable
              onPress={onRefresh}
              style={[styles.iconBtn, { backgroundColor: surface }]}
            >
              <IconSymbol
                name="arrow.clockwise"
                size={18}
                color={textPrimary}
              />
            </Pressable>
          </View>
        </View>
      </>
    );
  },
);

export default TrackingMap;

const styles = StyleSheet.create({
  topBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    gap: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  mapPin: {
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
  carMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
