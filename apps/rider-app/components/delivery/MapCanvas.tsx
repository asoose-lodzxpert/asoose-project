/**
 * MapCanvas  Uber/Bolt-style rider navigation map
 *
 * Improvements over the previous monolith:
 *    GPS logic extracted to useRiderLocation (2 s / 5 m, AppState-aware)
 *    Routing logic extracted to useRiderRoute (30 s throttle, force on status change)
 *    Smooth heading animation via Animated.Value (shortest-path delta  no 3582 flip)
 *    tracksViewChanges={false}  Animated.View handles rotation natively
 *    3-D camera pitch (15) + bearing during en-route for Google Maps Nav feel
 *    Route overview: fitToCoordinates on job start (pickup + dropoff in frame)
 *    Follow-mode toggle with FAB re-centre button
 *    onTouchStart on MapView disables follow-mode (user panned away)
 *    Guards: mapRef.current, isMapReady, coord bounds checks
 *    No overlapping polylines for the same segment
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import MapView, {
  Camera,
  Circle,
  LatLng,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRiderLocation } from "@/hooks/useRiderLocation";
import { useRiderRoute } from "@/hooks/useRiderRoute";

//
//  Map style constants
//

const LIGHT_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
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
  { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a1a" }] },
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

//
//  Camera constants
//

const NAV_ZOOM = 17;
const OVERVIEW_ZOOM = 13;
const NAV_PITCH = 15;
const FIXED_DELTA = 0.005;

//
//  Helpers
//

function resolveCoords(addr: unknown): LatLng | null {
  if (!addr || typeof addr !== "object") return null;
  const a = addr as Record<string, unknown>;
  const lat =
    typeof a.latitude === "number"
      ? a.latitude
      : typeof a.lat === "number"
        ? a.lat
        : null;
  const lng =
    typeof a.longitude === "number"
      ? a.longitude
      : typeof a.lng === "number"
        ? a.lng
        : null;
  if (lat === null || lng === null) return null;
  return { latitude: lat, longitude: lng };
}

function isValidCoord(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

//
//  Handle type
//

export type MapCanvasHandle = {
  animateToPickup: () => void;
  animateToDropoff: () => void;
  animateToCurrentLocation: () => void;
};

//
//  Component
//

const MapCanvas = forwardRef<MapCanvasHandle>((_, ref) => {
  const mapRef = useRef<MapView>(null);
  const { activeJob, status } = useJobs();
  const colorScheme = useColorScheme();
  const primary = useThemeColor({}, "brandPrimary");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");

  const [isMapReady, setIsMapReady] = useState(false);
  const [followMode, setFollowMode] = useState(true);

  //  Location
  const {
    location,
    permissionDenied,
    error: locationError,
  } = useRiderLocation();

  //  Stabilised pickup / dropoff coords
  const pickupCoords = useMemo(
    () => (activeJob ? resolveCoords(activeJob.pickupAddress) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeJob?.id,
      activeJob?.pickupAddress?.latitude ?? activeJob?.pickupAddress?.lat,
      activeJob?.pickupAddress?.longitude ?? activeJob?.pickupAddress?.lng,
    ],
  );
  const dropoffCoords = useMemo(
    () => (activeJob ? resolveCoords(activeJob.dropoffAddress) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeJob?.id,
      activeJob?.dropoffAddress?.latitude ?? activeJob?.dropoffAddress?.lat,
      activeJob?.dropoffAddress?.longitude ?? activeJob?.dropoffAddress?.lng,
    ],
  );

  //  Routing
  const {
    riderRouteCoords,
    plannedRouteCoords,
    distanceLeft,
    eta,
    currentInstruction,
    turnIcon,
  } = useRiderRoute({
    location,
    status,
    activeJob,
    pickupCoords,
    dropoffCoords,
  });

  //  Heading animation (smooth, shortest-path)
  const headingAnimRef = useRef(new Animated.Value(0));
  const lastHeadingRef = useRef(0);

  useEffect(() => {
    if (!location) return;
    const raw = location.heading;
    const prev = lastHeadingRef.current;
    const delta = ((raw - prev + 540) % 360) - 180;
    const next = prev + delta;
    lastHeadingRef.current = next;
    Animated.timing(headingAnimRef.current, {
      toValue: next,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [location]);

  const markerRotation = headingAnimRef.current.interpolate({
    inputRange: [-360, 360],
    outputRange: ["-360deg", "360deg"],
  });

  //  Route overview on job start
  const lastFittedJobId = useRef<string | null>(null);
  useEffect(() => {
    if (
      !isMapReady ||
      !mapRef.current ||
      !activeJob ||
      !pickupCoords ||
      !dropoffCoords ||
      lastFittedJobId.current === activeJob.id
    )
      return;

    lastFittedJobId.current = activeJob.id;
    const coords: LatLng[] = [pickupCoords, dropoffCoords];
    if (location && isValidCoord(location.latitude, location.longitude)) {
      coords.push({
        latitude: location.latitude,
        longitude: location.longitude,
      });
    }

    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 140, right: 50, bottom: 280, left: 50 },
        animated: true,
      });
    }, 400);
  }, [activeJob?.id, isMapReady, pickupCoords, dropoffCoords, location]);

  //  Navigation camera
  const isEnRoute =
    status === "en-route-pickup" || status === "en-route-dropoff";

  useEffect(() => {
    if (!isMapReady || !location || !mapRef.current || !followMode) return;
    if (!isValidCoord(location.latitude, location.longitude)) return;
    if (!isEnRoute) return;

    const camera: Camera = {
      center: { latitude: location.latitude, longitude: location.longitude },
      heading: location.heading,
      pitch: NAV_PITCH,
      zoom: NAV_ZOOM,
      altitude: 300,
    };
    mapRef.current.animateCamera(camera, { duration: 900 });
  }, [location, isEnRoute, isMapReady, followMode]);

  useEffect(() => {
    if (isEnRoute) setFollowMode(true);
  }, [isEnRoute]);

  //  Re-centre handler
  const handleRecenter = useCallback(() => {
    if (!location || !mapRef.current) return;
    if (!isValidCoord(location.latitude, location.longitude)) return;
    setFollowMode(true);
    mapRef.current.animateCamera(
      {
        center: { latitude: location.latitude, longitude: location.longitude },
        heading: isEnRoute ? location.heading : 0,
        pitch: isEnRoute ? NAV_PITCH : 0,
        zoom: isEnRoute ? NAV_ZOOM : OVERVIEW_ZOOM,
        altitude: 300,
      },
      { duration: 700 },
    );
  }, [location, isEnRoute]);

  //  Imperative handle
  useImperativeHandle(ref, () => ({
    animateToPickup() {
      if (!pickupCoords || !mapRef.current) return;
      setFollowMode(false);
      mapRef.current.animateCamera(
        {
          center: pickupCoords,
          zoom: NAV_ZOOM - 1,
          pitch: 0,
          heading: 0,
          altitude: 400,
        },
        { duration: 1000 },
      );
    },
    animateToDropoff() {
      if (!dropoffCoords || !mapRef.current) return;
      setFollowMode(false);
      mapRef.current.animateCamera(
        {
          center: dropoffCoords,
          zoom: NAV_ZOOM - 1,
          pitch: 0,
          heading: 0,
          altitude: 400,
        },
        { duration: 1000 },
      );
    },
    animateToCurrentLocation() {
      handleRecenter();
    },
  }));

  const mapStyle = colorScheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;
  const errorMessage = permissionDenied
    ? "Location permission denied. Please enable it in Settings."
    : (locationError ?? null);

  if (errorMessage) {
    return (
      <View
        style={[
          StyleSheet.absoluteFillObject,
          styles.centered,
          { backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f5f5f5" },
        ]}
      >
        <Text
          style={[
            styles.errorText,
            { color: colorScheme === "dark" ? "#fff" : "#000" },
          ]}
        >
          {errorMessage}
        </Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View
        style={[
          StyleSheet.absoluteFillObject,
          styles.centered,
          { backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f5f5f5" },
        ]}
      >
        <Text style={{ color: colorScheme === "dark" ? "#fff" : "#000" }}>
          Acquiring GPS fix
        </Text>
      </View>
    );
  }

  const riderLat = location.latitude;
  const riderLng = location.longitude;
  if (!isValidCoord(riderLat, riderLng)) return null;

  return (
    <>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyle}
        showsTraffic={false}
        pitchEnabled
        rotateEnabled
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: riderLat,
          longitude: riderLng,
          latitudeDelta: FIXED_DELTA,
          longitudeDelta: FIXED_DELTA,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass
        onMapReady={() => setIsMapReady(true)}
        onTouchStart={() => {
          if (followMode) setFollowMode(false);
        }}
      >
        {/* Rider marker with smooth heading animation */}
        <Marker
          coordinate={{ latitude: riderLat, longitude: riderLng }}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
          tracksViewChanges={false}
        >
          <View style={styles.riderMarkerWrap}>
            <Animated.View
              style={[
                styles.riderMarkerInner,
                { backgroundColor: primary },
                { transform: [{ rotate: markerRotation }] },
              ]}
            >
              <IconSymbol name="arrow.up" size={18} color="#fff" />
            </Animated.View>
          </View>
        </Marker>

        {/* GPS accuracy halo */}
        <Circle
          center={{ latitude: riderLat, longitude: riderLng }}
          radius={Math.max(location.accuracy, 10)}
          strokeColor={`${primary}4D`}
          fillColor={`${primary}1A`}
        />

        {/* Live route  rider to destination */}
        {riderRouteCoords.length > 0 && (
          <>
            <Polyline
              coordinates={riderRouteCoords}
              strokeColor="rgba(255,255,255,0.6)"
              strokeWidth={12}
            />
            <Polyline
              coordinates={riderRouteCoords}
              strokeColor={primary}
              strokeWidth={8}
            />
          </>
        )}

        {/* Planned route  pickup to dropoff (dashed, context) */}
        {plannedRouteCoords.length > 0 &&
          (status === "at-pickup" || status === "en-route-dropoff") && (
            <Polyline
              coordinates={plannedRouteCoords}
              strokeColor={colorScheme === "dark" ? "#555" : "#bbb"}
              strokeWidth={4}
              lineDashPattern={[8, 4]}
            />
          )}

        {/* Pickup marker */}
        {pickupCoords &&
          (status === "en-route-pickup" || status === "at-pickup") &&
          activeJob && (
            <Marker coordinate={pickupCoords} tracksViewChanges={false}>
              <View style={[styles.destMarker, { backgroundColor: success }]}>
                <IconSymbol
                  name={
                    activeJob.jobType === "ride" ? "person.fill" : "storefront"
                  }
                  size={20}
                  color="#fff"
                />
              </View>
            </Marker>
          )}

        {/* Dropoff marker */}
        {dropoffCoords &&
          (status === "at-pickup" || status === "en-route-dropoff") &&
          activeJob && (
            <Marker coordinate={dropoffCoords} tracksViewChanges={false}>
              <View style={[styles.destMarker, { backgroundColor: danger }]}>
                <IconSymbol
                  name={activeJob.jobType === "ride" ? "mappin" : "house.fill"}
                  size={20}
                  color="#fff"
                />
              </View>
            </Marker>
          )}

        {/* Confirm-job dropoff pin */}
        {status === "confirm-job" && dropoffCoords && (
          <Marker coordinate={dropoffCoords} tracksViewChanges={false}>
            <View style={[styles.destMarker, { backgroundColor: danger }]}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Turn instruction card */}
      {currentInstruction ? (
        <View
          style={[
            styles.turnIconCard,
            { backgroundColor: colorScheme === "dark" ? "#1E293B" : "#fff" },
          ]}
        >
          <View style={[styles.turnIconInner, { backgroundColor: primary }]}>
            <IconSymbol name={turnIcon as any} size={24} color="#fff" />
          </View>
          {distanceLeft ? (
            <Text
              style={[
                styles.turnIconDistance,
                { color: colorScheme === "dark" ? "#E2E8F0" : "#1E293B" },
              ]}
            >
              {distanceLeft}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* ETA overlay */}
      {!currentInstruction && distanceLeft && eta && activeJob && (
        <View
          style={[
            styles.etaOverlay,
            {
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(30,41,59,0.92)"
                  : "rgba(0,0,0,0.72)",
            },
          ]}
        >
          <Text style={styles.etaText}>{distanceLeft}</Text>
          <Text style={styles.etaSep}></Text>
          <Text style={styles.etaText}>ETA {eta}</Text>
        </View>
      )}

      {/* Re-centre FAB  only visible when follow mode is off */}
      {!followMode && (
        <TouchableOpacity
          style={[
            styles.recenterFab,
            { backgroundColor: colorScheme === "dark" ? "#1E293B" : "#fff" },
          ]}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <IconSymbol name="location.fill" size={22} color={primary} />
        </TouchableOpacity>
      )}
    </>
  );
});

MapCanvas.displayName = "MapCanvas";

export default MapCanvas;

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  riderMarkerWrap: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  riderMarkerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.9)",
  },
  destMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
  turnIconCard: {
    position: "absolute",
    top: 120,
    left: 16,
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    minWidth: 64,
  },
  turnIconInner: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  turnIconDistance: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
  },
  etaOverlay: {
    position: "absolute",
    bottom: 64,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    gap: 6,
  },
  etaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  etaSep: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
  },
  recenterFab: {
    position: "absolute",
    bottom: 72,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
});
