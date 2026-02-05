import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
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
const MAP_HEIGHT = SCREEN_HEIGHT * 0.5;

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

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
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

  // Get user's current location
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        // Get initial location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Watch location updates
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 10,
          },
          (location) => {
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          },
        );
      } catch (error) {
        console.error("Error getting location:", error);
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Fetch route directions
  const fetchRoute = useCallback(async () => {
    if (!currentRide?.pickupAddress || !currentRide?.dropoffAddress) return;

    try {
      const pickup = currentRide.pickupAddress;
      const dropoff = currentRide.dropoffAddress;

      const response = await get(
        `maps/directions?originLat=${pickup.lat}&originLng=${pickup.lng}&destLat=${dropoff.lat}&destLng=${dropoff.lng}`,
      );

      if (response.coordinates && response.coordinates.length > 0) {
        setRouteCoordinates(response.coordinates);
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    }
  }, [currentRide?.pickupAddress, currentRide?.dropoffAddress]);

  // Fit map to show all markers
  const fitMapToMarkers = useCallback(() => {
    if (!mapRef.current) return;

    const coordinates: { latitude: number; longitude: number }[] = [];

    // Add pickup
    if (currentRide?.pickupAddress) {
      coordinates.push({
        latitude: currentRide.pickupAddress.lat,
        longitude: currentRide.pickupAddress.lng,
      });
    }

    // Add dropoff
    if (currentRide?.dropoffAddress) {
      coordinates.push({
        latitude: currentRide.dropoffAddress.lat,
        longitude: currentRide.dropoffAddress.lng,
      });
    }

    // Add driver location
    if (driverLocation) {
      coordinates.push({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
      });
    }

    // Add user location if in progress
    if (userLocation && currentRide?.status === RideStatus.IN_PROGRESS) {
      coordinates.push(userLocation);
    }

    if (coordinates.length > 0) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
    }
  }, [currentRide, driverLocation, userLocation]);

  // Initial route fetch and map fit
  useEffect(() => {
    if (currentRide) {
      fetchRoute();
      setTimeout(() => fitMapToMarkers(), 500);
    }
  }, [currentRide?.id, fetchRoute]);

  // Update map when driver or user location changes
  useEffect(() => {
    if (driverLocation || userLocation) {
      fitMapToMarkers();
    }
  }, [driverLocation, userLocation]);

  if (!currentRide) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        <View style={styles.emptyState}>
          <ThemedText>No active ride</ThemedText>
          <Pressable
            onPress={() => router.replace("/ride")}
            style={styles.backLink}
          >
            <ThemedText type="link">Book a Ride</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

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

  const canCancel =
    currentRide.status === RideStatus.PENDING ||
    currentRide.status === RideStatus.REQUESTED ||
    currentRide.status === RideStatus.ACCEPTED;

  const showDriverInfo =
    currentRide.rider &&
    (currentRide.status === RideStatus.ACCEPTED ||
      currentRide.status === RideStatus.ARRIVED ||
      currentRide.status === RideStatus.IN_PROGRESS);

  const showOTP =
    currentRide.status === RideStatus.ARRIVED && currentRide.startOtp;

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Live Interactive Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: currentRide?.pickupAddress?.lat || 0,
            longitude: currentRide?.pickupAddress?.lng || 0,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={currentRide.status === RideStatus.IN_PROGRESS}
          showsMyLocationButton={false}
          showsCompass={true}
          rotateEnabled={false}
        >
          {/* Pickup Marker */}
          {currentRide.pickupAddress && (
            <Marker
              coordinate={{
                latitude: currentRide.pickupAddress.lat,
                longitude: currentRide.pickupAddress.lng,
              }}
              title="Pickup Location"
              pinColor="#10b981"
            />
          )}

          {/* Dropoff Marker */}
          {currentRide.dropoffAddress && (
            <Marker
              coordinate={{
                latitude: currentRide.dropoffAddress.lat,
                longitude: currentRide.dropoffAddress.lng,
              }}
              title="Dropoff Location"
              pinColor="#ef4444"
            />
          )}

          {/* Driver Marker */}
          {driverLocation && (
            <Marker
              coordinate={driverLocation}
              title="Driver"
              description={currentRide.rider?.name || "Your driver"}
            >
              <View
                style={{
                  backgroundColor: primary,
                  borderRadius: 20,
                  padding: 8,
                  borderWidth: 3,
                  borderColor: "#fff",
                }}
              >
                <IconSymbol name="car.fill" size={24} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Route Polyline */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={primary}
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          )}
        </MapView>

        {/* Overlay Header */}
        <View
          style={[styles.overlayHeader, { backgroundColor: `${surface}F5` }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={primary} />
          </Pressable>
          <View style={styles.headerContent}>
            <ThemedText type="subtitle">Your Ride</ThemedText>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: socketConnected ? success : danger,
                  },
                ]}
              />
              <ThemedText type="caption" style={{ color: textSecondary }}>
                {socketConnected ? "Live" : "Offline"}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Refresh Button */}
        <Pressable
          onPress={() => {
            handleRefresh();
            fetchRoute();
            fitMapToMarkers();
          }}
          style={[styles.refreshButton, { backgroundColor: surface }]}
        >
          <IconSymbol name="arrow.clockwise" size={20} color={primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Progress Tracker */}
        {currentRide.status !== RideStatus.PENDING &&
          currentRide.status !== RideStatus.CANCELLED && (
            <View style={[styles.progressCard, { backgroundColor: card }]}>
              <TripProgressTracker
                currentStatus={currentRide.status as RideStatus}
              />
            </View>
          )}

        {/* Finding Driver State */}
        {currentRide.status === RideStatus.REQUESTED && <FindingDriverView />}

        {/* Driver Info */}
        {showDriverInfo && <DriverInfoCard driver={currentRide.rider!} />}

        {/* OTP Display */}
        {showOTP && <OTPDisplay otp={currentRide.startOtp!} />}

        {/* Trip Details */}
        <View
          style={[
            styles.detailsCard,
            { backgroundColor: card, borderColor: border },
          ]}
        >
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Trip Details
          </ThemedText>

          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: success }]} />
            <View style={styles.locationText}>
              <ThemedText type="caption" style={{ color: textSecondary }}>
                Pickup
              </ThemedText>
              <ThemedText type="default">
                {currentRide.pickupAddress?.street || "Pickup location"}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.locationLine, { backgroundColor: border }]} />

          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: danger }]} />
            <View style={styles.locationText}>
              <ThemedText type="caption" style={{ color: textSecondary }}>
                Dropoff
              </ThemedText>
              <ThemedText type="default">
                {currentRide.dropoffAddress?.street || "Dropoff location"}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: border }]} />

          <View style={styles.infoRow}>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Distance
            </ThemedText>
            <ThemedText type="default">
              {RideService.formatDistance(currentRide.distanceKm || 0)}
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Estimated Fare
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: primary }}>
              {RideService.formatCurrency(currentRide.totalFare || 0)}
            </ThemedText>
          </View>
        </View>

        {/* Driver Location Info */}
        {driverLocation && (
          <View
            style={[
              styles.locationCard,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <View style={styles.locationHeader}>
              <IconSymbol name="location.fill" size={20} color={primary} />
              <ThemedText type="defaultSemiBold">Driver Location</ThemedText>
            </View>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Lat: {driverLocation.latitude.toFixed(6)}
            </ThemedText>
            <ThemedText type="caption" style={{ color: textSecondary }}>
              Lng: {driverLocation.longitude.toFixed(6)}
            </ThemedText>
          </View>
        )}

        {/* Status Messages */}
        {currentRide.status === RideStatus.ACCEPTED && (
          <View
            style={[styles.messageCard, { backgroundColor: `${primary}15` }]}
          >
            <IconSymbol name="car.fill" size={20} color={primary} />
            <ThemedText type="caption" style={{ color: primary }}>
              Your driver is on the way to pick you up
            </ThemedText>
          </View>
        )}

        {currentRide.status === RideStatus.ARRIVED && (
          <View
            style={[styles.messageCard, { backgroundColor: `${success}15` }]}
          >
            <IconSymbol name="checkmark.circle" size={20} color={success} />
            <ThemedText type="caption" style={{ color: success }}>
              Your driver has arrived at the pickup location
            </ThemedText>
          </View>
        )}

        {currentRide.status === RideStatus.IN_PROGRESS && (
          <View
            style={[styles.messageCard, { backgroundColor: `${primary}15` }]}
          >
            <IconSymbol name="arrow.right.circle" size={20} color={primary} />
            <ThemedText type="caption" style={{ color: primary }}>
              Trip in progress. Enjoy your ride!
            </ThemedText>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Cancel Button */}
      {canCancel && (
        <View style={[styles.footer, { backgroundColor: surface }]}>
          <Pressable
            onPress={handleCancelRide}
            disabled={cancelling}
            style={[
              styles.cancelButton,
              {
                backgroundColor: danger,
                opacity: cancelling ? 0.6 : 1,
              },
            ]}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <IconSymbol name="xmark.circle" size={20} color="white" />
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.cancelButtonText}
                >
                  Cancel Ride
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    width: "100%",
    height: MAP_HEIGHT,
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  overlayHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    gap: 12,
  },
  refreshButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  backLink: {
    padding: 8,
  },
  progressCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  detailsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  locationCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  messageCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 4,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  locationLine: {
    width: 2,
    height: 20,
    marginLeft: 5,
    marginVertical: 4,
  },
  locationText: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "white",
  },
});
