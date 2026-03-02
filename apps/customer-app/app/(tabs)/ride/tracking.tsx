import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useRide } from "@/context/RideContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { OTPDisplay } from "@/components/ride/OTPDisplay";
import { PaymentWebView } from "@/components/checkout/PaymentWebView";
import { ThemedText } from "@/components/themed-text";
import {
  TrackingMap,
  StatusHeader,
  RouteStrip,
  SearchingState,
  DriverInfoRow,
  PaymentPrompt,
  CancelRideModal,
  useRideTrackingMap,
  useRideActions,
  getDerivedRideState,
} from "@/components/ride-tracking";

export default function RideTrackingScreen() {
  const router = useRouter();
  const { currentRide, driverLocation, resetRideState, socketConnected } =
    useRide();

  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const danger = useThemeColor({}, "statusError");
  const primary = useThemeColor({}, "brandPrimary");
  const success = useThemeColor({}, "statusSuccess");

  const { mapRef, userLocation, routeCoords, driverRouteCoords, etaMinutes } =
    useRideTrackingMap(currentRide, driverLocation);

  const actions = useRideActions(currentRide);

  // Guard: no active ride  go home
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

    // PAID = post-ride payment confirmed — navigate to the success / receipt screen.
    if (st === "PAID") {
      const t = setTimeout(() => {
        router.replace("/(tabs)/ride/success" as any);
      }, 1500);
      return () => clearTimeout(t);
    }

    const cancelledStatuses = [
      "CANCELLED_BY_USER",
      "CANCELLED_BY_DRIVER",
      "CANCELLED_BY_SYSTEM",
      "CANCELLED",
    ];
    if (cancelledStatuses.includes(st)) {
      const t = setTimeout(() => {
        resetRideState();
        router.replace("/ride");
      }, 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRide?.status]);

  if (!currentRide) return null;

  const {
    st,
    searching,
    driverAccepted,
    awaitingPayment,
    inProgress,
    hasDriver,
    showOTP,
    showCancel,
    fareStr,
    driverPhone,
  } = getDerivedRideState(currentRide, primary, success);

  return (
    <View style={styles.root}>
      {/* Full-screen map + floating top bar */}
      <TrackingMap
        ref={mapRef}
        currentRide={currentRide}
        driverLocation={driverLocation}
        userLocation={userLocation}
        routeCoords={routeCoords}
        driverRouteCoords={driverRouteCoords}
        socketConnected={socketConnected}
        refreshing={actions.refreshing}
        etaMinutes={etaMinutes}
        onRefresh={actions.handleRefresh}
        onBack={() => router.back()}
      />

      {/* Bottom sheet */}
      <View style={[styles.sheet, { backgroundColor: surface }]}>
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: border }]} />
        </View>

        <StatusHeader status={st} formattedFare={fareStr} />

        <RouteStrip
          pickup={currentRide.pickupAddress}
          dropoff={currentRide.dropoffAddress}
        />

        <View style={[styles.divider, { backgroundColor: border }]} />

        {/* SEARCHING */}
        {searching && <SearchingState />}

        {/* DRIVER_ACCEPTED — driver en route to pickup, show OTP for ride start */}
        {driverAccepted && (
          <>
            {hasDriver && (
              <DriverInfoRow
                driver={currentRide.rider}
                driverPhone={driverPhone}
              />
            )}
            {showOTP && (
              <View style={{ marginTop: 12 }}>
                <OTPDisplay otp={currentRide.startOtp!} />
              </View>
            )}
          </>
        )}

        {/* IN_PROGRESS — ride ongoing, show driver info */}
        {inProgress && hasDriver && (
          <DriverInfoRow driver={currentRide.rider} driverPhone={driverPhone} />
        )}

        {/* COMPLETED — post-ride payment required */}
        {awaitingPayment && (
          <PaymentPrompt
            fare={currentRide.totalFare ?? 0}
            formattedFare={fareStr}
            onPay={actions.handlePayNow}
            paying={actions.paying}
          />
        )}

        {/* Cancel link */}
        {showCancel && (
          <Pressable
            onPress={actions.handleCancel}
            disabled={actions.cancelling}
            style={styles.cancelLink}
          >
            {actions.cancelling ? (
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

      {/* Payment WebView overlay */}
      {actions.paymentUrl && (
        <PaymentWebView
          visible={actions.showPaymentWebView}
          url={actions.paymentUrl}
          reference={actions.paymentRef}
          paymentMethod="paystack"
          onSuccess={actions.handlePaymentSuccess}
          onCancel={actions.handlePaymentCancel}
        />
      )}

      {/* Cancel ride bottom sheet */}
      <CancelRideModal
        visible={actions.showCancelSheet}
        selectedReason={actions.selectedReason}
        customReason={actions.customReason}
        cancelling={actions.cancelling}
        onClose={() => actions.setShowCancelSheet(false)}
        onSelectReason={actions.setSelectedReason}
        onChangeCustom={actions.setCustomReason}
        onConfirm={actions.handleConfirmCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  divider: { height: 1, marginVertical: 10 },
  cancelLink: {
    marginTop: 16,
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
});
