// â”€â”€ tracking screen â€“ map-first, state-driven bottom sheet â”€â”€
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Linking,
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
import { OTPDisplay } from "@/components/ride/OTPDisplay";
import { RideService } from "@/services/ride.service";
import { initiatePayment } from "@/services/payment.service";
import { PaymentWebView } from "@/components/checkout/PaymentWebView";
import { useUserProfile } from "@/hooks/useUserProfile";
import { get } from "@/lib/authFetch";
import { useMapStyle } from "@/hooks/useMapStyle";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// â”€â”€â”€ status helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function statusInfo(status: string): {
  label: string;
  sub?: string;
  pillColor?: string;
} {
  switch (status) {
    case "REQUESTED":
    case "SEARCHING_DRIVER":
      return {
        label: "Finding your driver",
        sub: "Usually takes under a minute",
      };
    case "DRIVER_ACCEPTED":
      return {
        label: "Driver found!",
        sub: "Confirm payment to let them start",
      };
    case "PAID":
    case "ACCEPTED":
      return {
        label: "Driver is on the way",
        sub: "Show your trip code when they arrive",
      };
    case "ARRIVED":
      return {
        label: "Driver has arrived",
        sub: "Share your trip code to begin",
      };
    case "IN_PROGRESS":
      return { label: "On the way", sub: "Heading to destination" };
    case "COMPLETED":
      return { label: "Ride completed", sub: "Thanks for riding!" };
    default:
      return { label: "Tracking ride" };
  }
}

// â”€â”€â”€ DriverRow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DriverRow({
  driver,
  onCall,
  primaryColor,
  successColor,
  surface2,
  border,
  textPrimary,
  textSecondary,
}: {
  driver: any;
  onCall?: () => void;
  primaryColor: string;
  successColor: string;
  surface2: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
}) {
  const initial = (driver?.firstName ?? driver?.name ?? "D")[0].toUpperCase();
  const fullName =
    driver?.firstName && driver?.lastName
      ? `${driver.firstName} ${driver.lastName}`
      : (driver?.name ?? "Your driver");
  const vehicle = driver?.vehicle
    ? [driver.vehicle.color, driver.vehicle.make, driver.vehicle.model]
        .filter(Boolean)
        .join(" ")
    : null;
  const plate = driver?.vehicle?.plateNumber;
  const rating = driver?.rating ? Number(driver.rating).toFixed(1) : null;

  return (
    <View style={dr.row}>
      {/* Avatar */}
      <View style={[dr.avatar, { backgroundColor: primaryColor + "22" }]}>
        <ThemedText
          type="defaultSemiBold"
          style={{ color: primaryColor, fontSize: 20 }}
        >
          {initial}
        </ThemedText>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
            {fullName}
          </ThemedText>
          {rating && (
            <View
              style={[dr.ratingChip, { backgroundColor: successColor + "18" }]}
            >
              <ThemedText
                type="caption"
                style={{ color: successColor, fontWeight: "700" }}
              >
                â˜… {rating}
              </ThemedText>
            </View>
          )}
        </View>
        {(vehicle || plate) && (
          <ThemedText
            type="caption"
            style={{ color: textSecondary, marginTop: 2 }}
          >
            {[vehicle, plate].filter(Boolean).join("  â€¢  ")}
          </ThemedText>
        )}
      </View>

      {/* Call button */}
      {onCall && (
        <Pressable
          onPress={onCall}
          style={[dr.callBtn, { backgroundColor: successColor }]}
        >
          <IconSymbol name="phone.fill" size={16} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const dr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

//  Main screen

export default function RideTrackingScreen() {
  const router = useRouter();
  const {
    currentRide,
    driverLocation,
    cancelRide,
    refreshCurrentRide,
    resetRideState,
    socketConnected,
  } = useRide();

  const { user } = useUserProfile();

  const mapStyle = useMapStyle();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textPrimary = useThemeColor({}, "textPrimary");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");

  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState<string>("");
  // Cancel bottom-sheet
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [driverRouteCoords, setDriverRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const mapRef = useRef<MapView>(null);

  // User location
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

  // Pickup  dropoff route
  const fetchRoute = useCallback(async () => {
    if (!currentRide?.pickupAddress || !currentRide?.dropoffAddress) return;
    const { pickupAddress: p, dropoffAddress: d } = currentRide;
    try {
      const res = await get(
        `maps/directions?originLat=${p.lat}&originLng=${p.lng}&destLat=${d.lat}&destLng=${d.lng}`,
      );
      setRouteCoords(Array.isArray(res?.coordinates) ? res.coordinates : []);
    } catch {
      setRouteCoords([]);
    }
  }, [currentRide?.pickupAddress, currentRide?.dropoffAddress]);

  // Driver  pickup approach route
  const fetchDriverRoute = useCallback(async () => {
    if (!currentRide?.pickupAddress || !driverLocation) {
      setDriverRouteCoords([]);
      return;
    }
    const isApproaching = [
      "DRIVER_ACCEPTED",
      "PAID",
      RideStatus.ACCEPTED,
      RideStatus.ARRIVED,
    ].includes(currentRide.status as string);
    if (!isApproaching) {
      setDriverRouteCoords([]);
      return;
    }
    const p = currentRide.pickupAddress;
    try {
      const res = await get(
        `maps/directions?originLat=${driverLocation.latitude}&originLng=${driverLocation.longitude}&destLat=${p.lat}&destLng=${p.lng}`,
      );
      setDriverRouteCoords(
        Array.isArray(res?.coordinates) ? res.coordinates : [],
      );
    } catch {
      setDriverRouteCoords([]);
    }
  }, [currentRide?.pickupAddress, currentRide?.status, driverLocation]);

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
        bottom: SCREEN_HEIGHT * 0.44,
        left: 40,
      },
      animated: true,
    });
  }, [currentRide, driverLocation, userLocation]);

  useEffect(() => {
    if (currentRide) {
      fetchRoute();
      setTimeout(fitMap, 500);
    } else {
      setRouteCoords([]);
      setDriverRouteCoords([]);
    }
  }, [currentRide?.id, fetchRoute]);

  useEffect(() => {
    fetchDriverRoute();
  }, [fetchDriverRoute]);
  useEffect(() => {
    if (driverLocation || userLocation) fitMap();
  }, [driverLocation, userLocation]);

  const handlePayNow = async () => {
    if (!currentRide?.id || !user) return;
    setPaying(true);
    try {
      const response = await initiatePayment(
        "paystack",
        {
          type: "RIDE",
          rideId: currentRide.id,
          callbackUrl: "asoose-app://payment-callback",
        },
        user,
      );
      const url = response.authorizationUrl || response.checkoutUrl;
      const ref = response.reference || response.transactionId || "";
      if (url) {
        setPaymentUrl(url);
        setPaymentRef(ref);
        setShowPaymentWebView(true);
      }
    } catch (e: any) {
      console.error("Payment init failed", e);
    } finally {
      setPaying(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentWebView(false);
    setPaymentUrl(null);
    // The Paystack webhook will flip the ride to PAID and emit PAYMENT_CONFIRMED
    // via WebSocket — RideContext handles the UI state transition automatically.
  };

  const handlePaymentCancel = () => {
    setShowPaymentWebView(false);
    setPaymentUrl(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCurrentRide();
    setRefreshing(false);
  };

  const CANCEL_REASONS = [
    "Changed my mind",
    "Driver is taking too long",
    "Wrong location entered",
    "Found another ride",
    "Booked by mistake",
    "Emergency came up",
    "Other (specify below)",
  ];

  const handleCancel = () => {
    setSelectedReason(null);
    setCustomReason("");
    setShowCancelSheet(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedReason) return;
    const isOther = selectedReason === "Other (specify below)";
    const reason = isOther ? customReason.trim() || "Other" : selectedReason;
    setCancelling(true);
    setShowCancelSheet(false);
    try {
      await cancelRide(reason);
      router.replace("/ride");
    } catch (e) {
      console.error(e);
    } finally {
      setCancelling(false);
    }
  };

  // Guard: if there's no active ride, navigate back to ride home
  useEffect(() => {
    if (!currentRide) {
      router.replace("/ride");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRide]);

  // Auto-navigate on terminal states
  useEffect(() => {
    if (!currentRide) return;
    const st = currentRide.status as string;
    if (st === "COMPLETED") {
      // Show completed state briefly then clear everything and go home
      const t = setTimeout(() => {
        resetRideState();
        router.replace("/ride");
      }, 3500);
      return () => clearTimeout(t);
    }
    // Safety net: if ride ends up in a cancelled state that socket didn't catch
    const cancelledStatuses = [
      "CANCELLED_BY_USER",
      "CANCELLED_BY_DRIVER",
      "CANCELLED_BY_SYSTEM",
      "CANCELLED",
    ];
    if (cancelledStatuses.includes(st)) {
      // Use setTimeout(0) to defer navigation out of the current render cycle
      const t = setTimeout(() => {
        resetRideState();
        router.replace("/ride");
      }, 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRide?.status]);

  if (!currentRide) {
    return null;
  }

  // Derived state
  const st = currentRide.status as string;
  const isSearching = st === "REQUESTED" || st === "SEARCHING_DRIVER";
  const isAwaitingPayment = st === "DRIVER_ACCEPTED";
  const isPaid = st === "PAID";
  const isInProgress = st === "IN_PROGRESS" || st === "ARRIVED";
  const hasDriver =
    !!currentRide.rider && (isAwaitingPayment || isPaid || isInProgress);
  const showOTP = isPaid && !!currentRide.startOtp;
  const canCancel = [
    "REQUESTED",
    "SEARCHING_DRIVER",
    "DRIVER_ACCEPTED",
    "PAID",
    RideStatus.PENDING,
    RideStatus.ACCEPTED,
  ].includes(st);

  const pillColor = isSearching
    ? primary
    : isAwaitingPayment
      ? "#F59E0B"
      : isInProgress
        ? success
        : primary;
  const { label: statusLabel, sub: statusSub } = statusInfo(st);
  const fareStr = RideService.formatCurrency(currentRide.totalFare ?? 0);
  const driverPhone: string | undefined =
    currentRide.rider?.phone ?? (currentRide.rider as any)?.user?.phone;

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
          bottom: SCREEN_HEIGHT * 0.44,
          left: 0,
        }}
        initialRegion={{
          latitude: currentRide.pickupAddress?.lat ?? 0,
          longitude: currentRide.pickupAddress?.lng ?? 0,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={isInProgress}
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
            <View style={[styles.mapPin, { backgroundColor: success }]}>
              <IconSymbol name="mappin" size={11} color="#fff" />
            </View>
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
              style={{ fontWeight: "700", letterSpacing: 0.5 }}
            >
              {socketConnected ? "LIVE" : "RECONNECTING"}
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

      {/* Bottom sheet */}
      <View style={[styles.sheet, { backgroundColor: surface }]}>
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: border }]} />
        </View>

        {/* Status pill + fare badge */}
        <View style={styles.statusHeaderRow}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: pillColor + "18",
                borderColor: pillColor + "40",
              },
            ]}
          >
            {isSearching ? (
              <ActivityIndicator
                size="small"
                color={pillColor}
                style={{ marginRight: 6 }}
              />
            ) : (
              <View
                style={[styles.statusDot, { backgroundColor: pillColor }]}
              />
            )}
            <ThemedText
              type="caption"
              style={{
                color: pillColor,
                fontWeight: "700",
                letterSpacing: 0.3,
              }}
            >
              {statusLabel.toUpperCase()}
            </ThemedText>
          </View>
          <View style={[styles.fareBadge, { backgroundColor: primary + "14" }]}>
            <ThemedText
              type="caption"
              style={{ color: primary, fontWeight: "700" }}
            >
              {fareStr}
            </ThemedText>
          </View>
        </View>

        {statusSub && (
          <ThemedText
            type="caption"
            style={{ color: textSecondary, marginTop: 3, marginBottom: 8 }}
          >
            {statusSub}
          </ThemedText>
        )}

        {/* Route strip */}
        <View
          style={[
            styles.routeStrip,
            { backgroundColor: card, borderColor: border },
          ]}
        >
          <View style={[styles.routeDot, { backgroundColor: success }]} />
          <ThemedText
            numberOfLines={1}
            type="caption"
            style={{ flex: 1, color: textSecondary }}
          >
            {currentRide.pickupAddress?.street ?? "Pickup"}
          </ThemedText>
          <IconSymbol
            name="arrow.right"
            size={10}
            color={textSecondary}
            style={{ marginHorizontal: 6 }}
          />
          <ThemedText
            numberOfLines={1}
            type="caption"
            style={{ flex: 1, color: textSecondary }}
          >
            {currentRide.dropoffAddress?.street ?? "Dropoff"}
          </ThemedText>
          <View style={[styles.routeDot, { backgroundColor: danger }]} />
        </View>

        <View style={[styles.divider, { backgroundColor: border }]} />

        {/* SEARCHING */}
        {isSearching && (
          <View
            style={[
              styles.searchingCard,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <ActivityIndicator size="large" color={primary} />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
                Looking for nearby drivers
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: textSecondary, marginTop: 2 }}
              >
                We'll notify you as soon as one accepts
              </ThemedText>
            </View>
          </View>
        )}

        {isAwaitingPayment && (
          <>
            {hasDriver && (
              <DriverRow
                driver={currentRide.rider}
                onCall={
                  driverPhone
                    ? () => Linking.openURL(`tel:${driverPhone}`)
                    : undefined
                }
                primaryColor={primary}
                successColor={success}
                surface2={card}
                border={border}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              />
            )}
            <View
              style={[
                styles.payCard,
                {
                  backgroundColor: primary + "10",
                  borderColor: primary + "40",
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <IconSymbol name="creditcard.fill" size={18} color={primary} />
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: primary, fontSize: 14 }}
                >
                  Complete payment to confirm ride
                </ThemedText>
              </View>
              <Pressable
                onPress={handlePayNow}
                disabled={paying}
                style={[styles.payBtn, { backgroundColor: primary }]}
              >
                {paying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ color: "#fff", fontSize: 15 }}
                  >
                    Pay {fareStr}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </>
        )}

        {/* PAID  show driver + OTP */}
        {isPaid && (
          <>
            {hasDriver && (
              <DriverRow
                driver={currentRide.rider}
                onCall={
                  driverPhone
                    ? () => Linking.openURL(`tel:${driverPhone}`)
                    : undefined
                }
                primaryColor={primary}
                successColor={success}
                surface2={card}
                border={border}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              />
            )}
            {showOTP && (
              <View style={{ marginTop: 12 }}>
                <OTPDisplay otp={currentRide.startOtp!} />
              </View>
            )}
          </>
        )}

        {/* IN PROGRESS  show driver only */}
        {isInProgress && hasDriver && (
          <DriverRow
            driver={currentRide.rider}
            onCall={
              driverPhone
                ? () => Linking.openURL(`tel:${driverPhone}`)
                : undefined
            }
            primaryColor={primary}
            successColor={success}
            surface2={card}
            border={border}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
        )}

        {canCancel && (
          <Pressable
            onPress={handleCancel}
            disabled={cancelling}
            style={styles.cancelLink}
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

      {/* Payment WebView */}
      {paymentUrl && (
        <PaymentWebView
          visible={showPaymentWebView}
          url={paymentUrl}
          reference={paymentRef}
          paymentMethod="paystack"
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}

      {/* ── Cancel Ride Bottom Sheet Modal ── */}
      <Modal
        visible={showCancelSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelSheet(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setShowCancelSheet(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.cancelSheetWrap}
        >
          <View style={[styles.cancelSheet, { backgroundColor: surface }]}>
            {/* Handle */}
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: border }]} />
            </View>

            {/* Title */}
            <ThemedText
              type="defaultSemiBold"
              style={[styles.cancelSheetTitle, { color: textPrimary }]}
            >
              Cancel Ride
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.cancelSheetSub, { color: textSecondary }]}
            >
              Please let us know why you're cancelling
            </ThemedText>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 340 }}
              keyboardShouldPersistTaps="handled"
            >
              {CANCEL_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <Pressable
                    key={reason}
                    onPress={() => setSelectedReason(reason)}
                    style={[
                      styles.reasonRow,
                      {
                        borderColor: isSelected ? primary : border,
                        backgroundColor: isSelected
                          ? primary + "10"
                          : "transparent",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: isSelected ? primary : border },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[
                            styles.radioInner,
                            { backgroundColor: primary },
                          ]}
                        />
                      )}
                    </View>
                    <ThemedText
                      style={[
                        styles.reasonText,
                        { color: isSelected ? primary : textPrimary },
                      ]}
                    >
                      {reason}
                    </ThemedText>
                  </Pressable>
                );
              })}

              {/* Custom reason input shown when "Other" selected */}
              {selectedReason === "Other (specify below)" && (
                <View
                  style={[
                    styles.customInputWrap,
                    { borderColor: primary, backgroundColor: card },
                  ]}
                >
                  <TextInput
                    value={customReason}
                    onChangeText={setCustomReason}
                    placeholder="Tell us what happened…"
                    placeholderTextColor={textSecondary}
                    style={[styles.customInput, { color: textPrimary }]}
                    multiline
                    maxLength={200}
                    textAlignVertical="top"
                    autoFocus
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color: textSecondary,
                      textAlign: "right",
                      paddingRight: 4,
                      paddingBottom: 4,
                    }}
                  >
                    {customReason.length}/200
                  </ThemedText>
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.cancelSheetActions}>
              <Pressable
                onPress={() => setShowCancelSheet(false)}
                style={[
                  styles.actionBtn,
                  {
                    borderColor: border,
                    borderWidth: 1,
                    backgroundColor: card,
                  },
                ]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: textPrimary }}
                >
                  Keep Ride
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleConfirmCancel}
                disabled={
                  !selectedReason ||
                  (selectedReason === "Other (specify below)" &&
                    customReason.trim().length === 0)
                }
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor:
                      !selectedReason ||
                      (selectedReason === "Other (specify below)" &&
                        customReason.trim().length === 0)
                        ? danger + "50"
                        : danger,
                  },
                ]}
              >
                <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
                  Cancel Ride
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
  },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  statusHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  fareBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  routeStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  routeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  divider: { height: 1, marginVertical: 10 },
  searchingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
  },
  payCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
  },
  payBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelLink: {
    marginTop: 16,
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  /* Cancel sheet */
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  cancelSheetWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  cancelSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  cancelSheetTitle: {
    fontSize: 18,
    marginBottom: 4,
    textAlign: "center",
  },
  cancelSheetSub: {
    textAlign: "center",
    marginBottom: 16,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  reasonText: {
    fontSize: 14,
    flex: 1,
  },
  customInputWrap: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 8,
  },
  customInput: {
    fontSize: 14,
    minHeight: 72,
    lineHeight: 20,
  },
  cancelSheetActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
});
