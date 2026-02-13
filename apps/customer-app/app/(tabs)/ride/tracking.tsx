import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
  SafeAreaView,
  useColorScheme,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRide } from "@/context/RideContext";
import { RideStatus } from "@/types/ride";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { FindingDriverView } from "@/components/ride/FindingDriverView";
import { DriverInfoCard } from "@/components/ride/DriverInfoCard";
import { TripProgressTracker } from "@/components/ride/TripProgressTracker";
import { OTPDisplay } from "@/components/ride/OTPDisplay";
import { RideService } from "@/services/ride.service";
import { get } from "@/lib/authFetch";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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

  // Colors
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const cardColor = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");

  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  const mapRef = useRef<MapView>(null);

  const mapStyle = colorScheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

  // --- Location & Route Logic (Kept mostly same, adjusted padding) ---
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setUserLocation(location.coords);
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 10,
          },
          (loc) => setUserLocation(loc.coords),
        );
      } catch (error) {
        console.error("Error getting location:", error);
      }
    };
    startLocationTracking();
    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  // Always fetch directions from backend API
  const fetchRoute = useCallback(async () => {
    if (!currentRide?.pickupAddress || !currentRide?.dropoffAddress) return;
    try {
      const pickup = currentRide.pickupAddress;
      const dropoff = currentRide.dropoffAddress;
      // Fetch directions from backend API
      const response = await get(
        `maps/directions?originLat=${pickup.lat}&originLng=${pickup.lng}&destLat=${dropoff.lat}&destLng=${dropoff.lng}`,
      );
      // Only use backend response for route coordinates
      if (
        response &&
        Array.isArray(response.coordinates) &&
        response.coordinates.length > 0
      ) {
        setRouteCoordinates(response.coordinates);
      } else {
        setRouteCoordinates([]);
      }
      // No client-side direction logic or fallback here
    } catch (error) {
      console.error("Error fetching route from backend:", error);
      setRouteCoordinates([]);
    }
  }, [currentRide?.pickupAddress, currentRide?.dropoffAddress]);

  const fitMapToMarkers = useCallback(() => {
    if (!mapRef.current) return;
    const coordinates: { latitude: number; longitude: number }[] = [];
    if (currentRide?.pickupAddress)
      coordinates.push({
        latitude: currentRide.pickupAddress.lat,
        longitude: currentRide.pickupAddress.lng,
      });
    if (currentRide?.dropoffAddress)
      coordinates.push({
        latitude: currentRide.dropoffAddress.lat,
        longitude: currentRide.dropoffAddress.lng,
      });
    if (driverLocation) coordinates.push(driverLocation);
    if (userLocation && currentRide?.status === RideStatus.IN_PROGRESS)
      coordinates.push(userLocation);

    if (coordinates.length > 0) {
      mapRef.current.fitToCoordinates(coordinates, {
        // 4. Critical: Add bottom padding so the route isn't hidden by the bottom card
        edgePadding: {
          top: 120,
          right: 40,
          bottom: SCREEN_HEIGHT * 0.45,
          left: 40,
        },
        animated: true,
      });
    }
  }, [currentRide, driverLocation, userLocation]);

  useEffect(() => {
    if (currentRide) {
      fetchRoute();
      setTimeout(() => fitMapToMarkers(), 500);
    }
  }, [currentRide?.id, fetchRoute]);

  useEffect(() => {
    if (driverLocation || userLocation) fitMapToMarkers();
  }, [driverLocation, userLocation]);

  // --- Handlers ---
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCurrentRide();
    setRefreshing(false);
  };

  const handleCancelRide = async () => {
    const confirmed = await showConfirm({
      title: "Cancel Ride",
      message: "Are you sure you want to cancel this ride?",
      confirmLabel: "Yes, Cancel",
      cancelLabel: "No",
    });
    if (confirmed) {
      setCancelling(true);
      try {
        await cancelRide("Cancelled by user");
        router.replace("/ride");
      } catch (err) {
        console.error("Cancel error:", err);
      } finally {
        setCancelling(false);
      }
    }
  };

  if (!currentRide) return null; // Handle empty state elsewhere or simple loader

  const canCancel = [
    RideStatus.PENDING,
    RideStatus.REQUESTED,
    RideStatus.ACCEPTED,
  ].includes(currentRide.status as RideStatus);
  const showDriverInfo =
    currentRide.rider &&
    [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS].includes(
      currentRide.status as RideStatus,
    );
  const showOTP =
    currentRide.status === RideStatus.ARRIVED && currentRide.startOtp;

  return (
    <View style={styles.container}>
      {/* 1. Full Screen Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject} // Fills the screen behind everything
        customMapStyle={mapStyle} // The modern look
        // Padding forces map center to be in the top visible area
        mapPadding={{ top: 20, right: 0, bottom: SCREEN_HEIGHT * 0.4, left: 0 }}
        initialRegion={{
          latitude: currentRide?.pickupAddress?.lat || 0,
          longitude: currentRide?.pickupAddress?.lng || 0,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={currentRide.status === RideStatus.IN_PROGRESS}
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled={false}
      >
        {/* Simplified Markers (Modern) */}
        {currentRide.pickupAddress && (
          <Marker
            coordinate={{
              latitude: currentRide.pickupAddress.lat,
              longitude: currentRide.pickupAddress.lng,
            }}
            title="Pickup"
          >
            {/* Custom simple dot marker often looks better than default pin */}
            <View
              style={[
                styles.dotMarker,
                { backgroundColor: success, borderColor: "white" },
              ]}
            />
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
            <View
              style={[
                styles.dotMarker,
                { backgroundColor: danger, borderColor: "white" },
              ]}
            />
          </Marker>
        )}

        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            title="Driver"
            flat
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.driverMarker, { backgroundColor: primary }]}>
              <IconSymbol name="car.fill" size={20} color="#fff" />
            </View>
          </Marker>
        )}

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="black" // Modern maps often use black or dark grey for route
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* 2. Floating Top Header (Glassmorphism) */}
      <SafeAreaView style={styles.topContainer} pointerEvents="box-none">
        <View style={styles.headerRow}>
          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            style={[styles.floatingButton, { backgroundColor: surface }]}
          >
            <IconSymbol name="arrow.left" size={24} color={primary} />
          </Pressable>

          {/* Status Pill */}
          <View style={[styles.statusPill, { backgroundColor: surface }]}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: socketConnected ? success : danger },
              ]}
            />
            <ThemedText type="caption" style={{ fontWeight: "600" }}>
              {socketConnected ? "LIVE" : "CONNECTING..."}
            </ThemedText>
          </View>

          {/* Refresh Button */}
          <Pressable
            onPress={handleRefresh}
            style={[styles.floatingButton, { backgroundColor: surface }]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={primary} />
            ) : (
              <IconSymbol name="arrow.clockwise" size={20} color={primary} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      {/* 3. Modern Bottom Sheet Card */}
      <View style={[styles.bottomSheet, { backgroundColor: surface }]}>
        {/* Drag Handle */}
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>

        <ScrollView
          style={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header Status (Driver on the way, etc) */}
          <View style={styles.sheetHeader}>
            <ThemedText type="subtitle" style={{ fontSize: 18 }}>
              {currentRide.status === RideStatus.REQUESTED
                ? "Finding your driver..."
                : currentRide.status === RideStatus.IN_PROGRESS
                  ? "Heading to destination"
                  : currentRide.status === RideStatus.ARRIVED
                    ? "Driver has arrived"
                    : "Driver is on the way"}
            </ThemedText>
            {/* Optional ETA text could go here */}
          </View>

          {/* Progress Bar */}
          {currentRide.status !== RideStatus.PENDING && (
            <View style={{ marginVertical: 16 }}>
              <TripProgressTracker
                currentStatus={currentRide.status as RideStatus}
              />
            </View>
          )}

          {/* Dynamic Content based on status */}
          {currentRide.status === RideStatus.REQUESTED && <FindingDriverView />}

          {showDriverInfo && (
            <View style={[styles.cardSection, { backgroundColor: cardColor }]}>
              <DriverInfoCard driver={currentRide.rider!} />
            </View>
          )}

          {showOTP && (
            <View style={{ marginTop: 12 }}>
              <OTPDisplay otp={currentRide.startOtp!} />
            </View>
          )}

          {/* Trip Details (Simplified) */}
          <View
            style={[
              styles.cardSection,
              { backgroundColor: cardColor, marginTop: 16 },
            ]}
          >
            <View style={styles.addressRow}>
              <IconSymbol name="mappin.circle.fill" size={20} color={success} />
              <View style={{ flex: 1 }}>
                <ThemedText type="caption" style={{ color: textSecondary }}>
                  Pickup
                </ThemedText>
                <ThemedText numberOfLines={1} type="defaultSemiBold">
                  {currentRide.pickupAddress?.street}
                </ThemedText>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.addressRow}>
              <IconSymbol name="mappin.circle.fill" size={20} color={danger} />
              <View style={{ flex: 1 }}>
                <ThemedText type="caption" style={{ color: textSecondary }}>
                  Dropoff
                </ThemedText>
                <ThemedText numberOfLines={1} type="defaultSemiBold">
                  {currentRide.dropoffAddress?.street}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.divider, { marginVertical: 12 }]} />

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <ThemedText>Total Fare</ThemedText>
              <ThemedText type="subtitle">
                {RideService.formatCurrency(currentRide.totalFare || 0)}
              </ThemedText>
            </View>
          </View>

          {/* Cancel Button */}
          {canCancel && (
            <Pressable
              onPress={handleCancelRide}
              disabled={cancelling}
              style={[
                styles.cancelButton,
                { backgroundColor: `${danger}15`, marginTop: 24 },
              ]}
            >
              {cancelling ? (
                <ActivityIndicator color={danger} />
              ) : (
                <ThemedText style={{ color: danger, fontWeight: "600" }}>
                  Cancel Ride
                </ThemedText>
              )}
            </Pressable>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  // Floating Top UI
  topContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 40 : 10,
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    // Shadow for elevation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Map Markers
  dotMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  driverMarker: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // Bottom Sheet
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.5, // Ensures map is always visible
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    paddingBottom: 20,
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#e0e0e0",
  },
  sheetContent: {
    paddingHorizontal: 20,
  },
  sheetHeader: {
    marginBottom: 16,
  },
  cardSection: {
    padding: 16,
    borderRadius: 16,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 32, // align with text
    marginVertical: 12,
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
