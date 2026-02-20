// ── redesigned: minimal, map-first, compact bottom sheet ──
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRide } from "@/context/RideContext";
import { RideStatus } from "@/types/ride";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { DriverInfoCard } from "@/components/ride/DriverInfoCard";
import { OTPDisplay } from "@/components/ride/OTPDisplay";
import { RideService } from "@/services/ride.service";
import { get } from "@/lib/authFetch";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const LIGHT_MAP_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#bdbdbd" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#e5e5e5" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#dadada" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [{ color: "#e5e5e5" }],
  },
  {
    featureType: "transit.station",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c9c9c9" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
];

const DARK_MAP_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8a8a" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#1a1a1a" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5a5a5a" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#2a2a2a" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6a6a6a" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2c2c2c" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7a7a7a" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3c3c3c" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8a8a" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6a6a6a" }],
  },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [{ color: "#2a2a2a" }],
  },
  {
    featureType: "transit.station",
    elementType: "geometry",
    stylers: [{ color: "#2a2a2a" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
];

function statusLabel(status: RideStatus): string {
  switch (status) {
    case RideStatus.REQUESTED:
      return "Finding your driver";
    case RideStatus.ACCEPTED:
      return "Driver is on the way";
    case RideStatus.ARRIVED:
      return "Driver has arrived";
    case RideStatus.IN_PROGRESS:
      return "Heading to destination";
    default:
      return "Tracking ride";
  }
}

export default function RideTrackingScreen() {
  const router = useRouter();
  const showConfirm = useConfirm();
  const {
    currentRide,
    driverLocation,
    cancelRide,
    refreshCurrentRide,
    socketConnected,
  } = useRide();
  const colorScheme = useColorScheme();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const cardColor = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");

  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  const mapRef = useRef<MapView>(null);
  const mapStyle = colorScheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

  // Location tracking
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation(loc.coords);
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        (l) => setUserLocation(l.coords),
      );
    })();
    return () => {
      sub?.remove();
    };
  }, []);

  // Fetch route from backend
  const fetchRoute = useCallback(async () => {
    if (!currentRide?.pickupAddress || !currentRide?.dropoffAddress) return;
    try {
      const { pickupAddress: p, dropoffAddress: d } = currentRide;
      const res = await get(
        `maps/directions?originLat=${p.lat}&originLng=${p.lng}&destLat=${d.lat}&destLng=${d.lng}`,
      );
      setRouteCoords(Array.isArray(res?.coordinates) ? res.coordinates : []);
    } catch {
      setRouteCoords([]);
    }
  }, [currentRide?.pickupAddress, currentRide?.dropoffAddress]);

  const fitMap = useCallback(() => {
    if (!mapRef.current) return;
    const coords: { latitude: number; longitude: number }[] = [];
    if (currentRide?.pickupAddress)
      coords.push({
        latitude: currentRide.pickupAddress.lat,
        longitude: currentRide.pickupAddress.lng,
      });
    if (currentRide?.dropoffAddress)
      coords.push({
        latitude: currentRide.dropoffAddress.lat,
        longitude: currentRide.dropoffAddress.lng,
      });
    if (driverLocation) coords.push(driverLocation);
    if (userLocation && currentRide?.status === RideStatus.IN_PROGRESS)
      coords.push(userLocation);
    if (coords.length === 0) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: {
        top: 90,
        right: 40,
        bottom: SCREEN_HEIGHT * 0.36,
        left: 40,
      },
      animated: true,
    });
  }, [currentRide, driverLocation, userLocation]);

  useEffect(() => {
    if (currentRide) {
      fetchRoute();
      setTimeout(fitMap, 500);
    }
  }, [currentRide?.id, fetchRoute]);

  useEffect(() => {
    if (driverLocation || userLocation) fitMap();
  }, [driverLocation, userLocation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCurrentRide();
    setRefreshing(false);
  };

  const handleCancel = async () => {
    const ok = await showConfirm({
      title: "Cancel Ride",
      message: "Are you sure you want to cancel this ride?",
      confirmLabel: "Yes, Cancel",
      cancelLabel: "No",
    });
    if (!ok) return;
    setCancelling(true);
    try {
      await cancelRide("Cancelled by user");
      router.replace("/ride");
    } catch (e) {
      console.error(e);
    } finally {
      setCancelling(false);
    }
  };

  if (!currentRide) {
    router.replace("/ride");
    return null;
  }

  const canCancel = [
    RideStatus.PENDING,
    RideStatus.REQUESTED,
    RideStatus.ACCEPTED,
  ].includes(currentRide.status as RideStatus);
  const showDriver =
    currentRide.rider &&
    [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS].includes(
      currentRide.status as RideStatus,
    );
  const showOTP =
    currentRide.status === RideStatus.ARRIVED && currentRide.startOtp;

  return (
    <View style={styles.root}>
      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        customMapStyle={mapStyle}
        mapPadding={{
          top: 20,
          right: 0,
          bottom: SCREEN_HEIGHT * 0.34,
          left: 0,
        }}
        initialRegion={{
          latitude: currentRide.pickupAddress?.lat ?? 0,
          longitude: currentRide.pickupAddress?.lng ?? 0,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={currentRide.status === RideStatus.IN_PROGRESS}
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled={false}
      >
        {currentRide.pickupAddress && (
          <Marker
            coordinate={{
              latitude: currentRide.pickupAddress.lat,
              longitude: currentRide.pickupAddress.lng,
            }}
            title="Pickup"
          >
            <View style={[styles.dot, { backgroundColor: success }]} />
          </Marker>
        )}
        {currentRide.dropoffAddress && (
          <Marker
            coordinate={{
              latitude: currentRide.dropoffAddress.lat,
              longitude: currentRide.dropoffAddress.lng,
            }}
            title="Dropoff"
          >
            <View style={[styles.dot, { backgroundColor: danger }]} />
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
              <IconSymbol name="car.fill" size={16} color={textOnPrimary} />
            </View>
          </Marker>
        )}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={primary}
            strokeWidth={3}
          />
        )}
      </MapView>

      {/* Floating top bar */}
      <SafeAreaView style={styles.topBar} pointerEvents="box-none">
        <View
          style={[
            styles.topRow,
            { paddingTop: Platform.OS === "android" ? 40 : 10 },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
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
              style={{ fontWeight: "700", letterSpacing: 0.4 }}
            >
              {socketConnected ? "LIVE" : "..."}
            </ThemedText>
          </View>

          <Pressable
            onPress={handleRefresh}
            style={[styles.iconBtn, { backgroundColor: surface }]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={primary} />
            ) : (
              <IconSymbol
                name="arrow.clockwise"
                size={18}
                color={textPrimary}
              />
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Compact bottom sheet */}
      <View style={[styles.sheet, { backgroundColor: surface }]}>
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: border }]} />
        </View>

        {/* Status + fare */}
        <View style={styles.statusRow}>
          {currentRide.status === RideStatus.REQUESTED && (
            <ActivityIndicator
              size="small"
              color={primary}
              style={{ marginRight: 8 }}
            />
          )}
          <ThemedText type="defaultSemiBold" style={{ fontSize: 15, flex: 1 }}>
            {statusLabel(currentRide.status as RideStatus)}
          </ThemedText>
          <ThemedText type="defaultSemiBold" style={{ color: primary }}>
            {RideService.formatCurrency(currentRide.totalFare ?? 0)}
          </ThemedText>
        </View>

        {/* Compact route line */}
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: success }]} />
          <ThemedText
            numberOfLines={1}
            type="caption"
            style={{ flex: 1, color: textSecondary }}
          >
            {currentRide.pickupAddress?.street ?? "—"}
          </ThemedText>
          <IconSymbol
            name="arrow.right"
            size={11}
            color={textSecondary}
            style={{ marginHorizontal: 4 }}
          />
          <ThemedText
            numberOfLines={1}
            type="caption"
            style={{ flex: 1, color: textSecondary }}
          >
            {currentRide.dropoffAddress?.street ?? "—"}
          </ThemedText>
          <View style={[styles.routeDot, { backgroundColor: danger }]} />
        </View>

        {/* Driver card — shown only when driver is assigned */}
        {showDriver && (
          <>
            <View style={[styles.divider, { backgroundColor: border }]} />
            <DriverInfoCard driver={currentRide.rider!} />
          </>
        )}

        {/* OTP */}
        {showOTP && (
          <View style={{ marginTop: 10 }}>
            <OTPDisplay otp={currentRide.startOtp!} />
          </View>
        )}

        {/* Cancel — subtle text link */}
        {canCancel && (
          <Pressable
            onPress={handleCancel}
            disabled={cancelling}
            style={styles.cancelBtn}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={danger} />
            ) : (
              <ThemedText
                type="caption"
                style={{ color: danger, fontWeight: "600" }}
              >
                Cancel Ride
              </ThemedText>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Top bar
  topBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },

  // Map markers
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  carMarker: {
    padding: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  // Bottom sheet
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 14,
  },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle: { width: 36, height: 4, borderRadius: 2 },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  routeDot: { width: 8, height: 8, borderRadius: 4 },

  divider: { height: 1, marginVertical: 12 },

  cancelBtn: {
    marginTop: 14,
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
});
