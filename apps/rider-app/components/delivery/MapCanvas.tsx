import * as Location from "expo-location";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
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
import { getDirections, NavigationStep } from "@/services/maps";

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

/** Maps a turn-by-turn instruction string to an SF Symbol icon name */
function instructionToIcon(instruction: string): string {
  const lower = instruction.toLowerCase();
  if (lower.includes("u-turn") || lower.includes("uturn"))
    return "arrow.uturn.left";
  if (lower.includes("turn left") || lower.includes("left"))
    return "arrow.turn.up.left";
  if (lower.includes("turn right") || lower.includes("right"))
    return "arrow.turn.up.right";
  if (lower.includes("keep left") || lower.includes("bear left"))
    return "arrow.up.left";
  if (lower.includes("keep right") || lower.includes("bear right"))
    return "arrow.up.right";
  return "arrow.up";
}

/** Extract LatLng from various address formats */
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

export type MapCanvasHandle = {
  animateToPickup: () => void;
  animateToDropoff: () => void;
  animateToCurrentLocation: () => void;
};

/**
 * Zoom levels:
 *   - NAV_ZOOM         → Google-Nav style close zoom (street-level, ~17-18)
 *   - FIXED_*          → initial region span / non-nav fallback
 *   - NAV_PITCH        → camera tilt for 3D perspective
 *   - AHEAD_OFFSET_DEG → degrees ahead to offset camera center so rider sits at bottom
 */
const NAV_ZOOM = 18;
const FIXED_LATITUDE_DELTA = 0.005;
const FIXED_LONGITUDE_DELTA = 0.005;

const MapCanvas = forwardRef<MapCanvasHandle>((_, ref) => {
  const mapRef = useRef<MapView>(null);
  const { activeJob, status } = useJobs();
  const colorScheme = useColorScheme();
  const primary = useThemeColor({}, "brandPrimary");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [riderRouteCoords, setRiderRouteCoords] = useState<LatLng[]>([]);
  const [plannedRouteCoords, setPlannedRouteCoords] = useState<LatLng[]>([]);
  const [distanceLeft, setDistanceLeft] = useState("");
  const [eta, setEta] = useState("");
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [routeSteps, setRouteSteps] = useState<NavigationStep[]>([]);
  const [currentInstruction, setCurrentInstruction] = useState("");
  const [nextInstruction, setNextInstruction] = useState("");
  const [turnIcon, setTurnIcon] = useState<string>("arrow.up");

  const lastRouteFetchRef = useRef<number>(0);
  const ROUTE_REFETCH_INTERVAL_MS = 20_000;

  const mapStyle = colorScheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

  // Stabilise coords with useMemo so the object reference only changes when the
  // actual coordinate values change, not on every render. Without this,
  // fetchRiderRoute (which depends on pickupCoords / dropoffCoords) gets a new
  // reference every render, causing an infinite useEffect → setState loop.
  const pickupCoords = useMemo(
    () => (activeJob ? resolveCoords(activeJob.pickupAddress) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeJob?.id,
      activeJob?.currentStopIndex,
      // stringify the relevant parts so the memo updates when the address changes
      // (e.g. multi-stop advances to the next pickup address)
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

  // ───────────────────────────────────────────────
  //  Location tracking
  // ───────────────────────────────────────────────
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status: perm } =
          await Location.requestForegroundPermissionsAsync();
        if (perm !== "granted") {
          setMapError("Location permission denied");
          return;
        }

        const current = await Location.getCurrentPositionAsync({});
        setLocation(current);
        setMapError(null);

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => setLocation(loc),
        );
      } catch (e) {
        setMapError(`Location error: ${String(e)}`);
      }
    })();

    return () => {
      sub?.remove();
    };
  }, []);

  // ───────────────────────────────────────────────
  //  Planned route: pickup → dropoff (once per job)
  // ───────────────────────────────────────────────
  useEffect(() => {
    if (!pickupCoords || !dropoffCoords) {
      setPlannedRouteCoords([]);
      return;
    }

    (async () => {
      try {
        const { coordinates, error } = await getDirections({
          originLat: pickupCoords.latitude,
          originLng: pickupCoords.longitude,
          destLat: dropoffCoords.latitude,
          destLng: dropoffCoords.longitude,
        });
        if (!error && coordinates?.length) {
          setPlannedRouteCoords(coordinates);
        }
      } catch {}
    })();
  }, [activeJob?.id]);

  // ───────────────────────────────────────────────
  //  Live route: rider → current destination
  // ───────────────────────────────────────────────
  const fetchRiderRoute = useCallback(async () => {
    if (!location || !activeJob) {
      setRiderRouteCoords([]);
      return;
    }

    const now = Date.now();
    if (now - lastRouteFetchRef.current < ROUTE_REFETCH_INTERVAL_MS) return;
    lastRouteFetchRef.current = now;

    let dest: LatLng | null = null;
    if (status === "en-route-pickup") dest = pickupCoords;
    else if (status === "en-route-dropoff") dest = dropoffCoords;

    if (!dest) {
      setRiderRouteCoords([]);
      setDistanceLeft("");
      setEta("");
      return;
    }

    try {
      const { coordinates, distance, duration, steps, error } =
        await getDirections({
          originLat: location.coords.latitude,
          originLng: location.coords.longitude,
          destLat: dest.latitude,
          destLng: dest.longitude,
        });

      if (error || !coordinates?.length) return;

      setRiderRouteCoords(coordinates);
      setDistanceLeft(distance.text);
      setEta(duration.text);
      if (steps?.length) {
        setRouteSteps(steps);
        setCurrentInstruction(steps[0]?.instruction ?? "");
        setNextInstruction(steps[1]?.instruction ?? "");
        setTurnIcon(instructionToIcon(steps[0]?.instruction ?? ""));
      }
    } catch {}
  }, [location, status, activeJob, pickupCoords, dropoffCoords]);

  useEffect(() => {
    if (status === "en-route-pickup" || status === "en-route-dropoff") {
      lastRouteFetchRef.current = 0; // force immediate fetch
      fetchRiderRoute();
    } else {
      setRiderRouteCoords([]);
      setRouteSteps([]);
      setCurrentInstruction("");
      setNextInstruction("");
      setDistanceLeft("");
      setEta("");
    }
  }, [status, activeJob?.id, fetchRiderRoute]);

  useEffect(() => {
    if (status === "en-route-pickup" || status === "en-route-dropoff") {
      fetchRiderRoute();
    }
  }, [location, fetchRiderRoute]);

  // ───────────────────────────────────────────────
  //  Track which step we're on based on rider position
  // ───────────────────────────────────────────────
  useEffect(() => {
    if (!location || routeSteps.length === 0) return;
    const riderLat = location.coords.latitude;
    const riderLng = location.coords.longitude;

    // Find the first step whose endLocation we haven't reached yet
    // (i.e., distance > 30m from the rider)
    const PASSED_THRESHOLD_M = 40;
    const toMeters = (dLat: number, dLng: number) =>
      Math.sqrt(dLat * dLat + dLng * dLng) * 111_320;

    let activeIdx = 0;
    for (let i = 0; i < routeSteps.length; i++) {
      const s = routeSteps[i];
      const dist = toMeters(
        s.endLocation.latitude - riderLat,
        s.endLocation.longitude - riderLng,
      );
      if (dist > PASSED_THRESHOLD_M) {
        activeIdx = i;
        break;
      }
      activeIdx = Math.min(i + 1, routeSteps.length - 1);
    }

    setCurrentInstruction(routeSteps[activeIdx]?.instruction ?? "");
    setNextInstruction(routeSteps[activeIdx + 1]?.instruction ?? "");
    setTurnIcon(instructionToIcon(routeSteps[activeIdx]?.instruction ?? ""));
  }, [location, routeSteps]);

  // ───────────────────────────────────────────────
  //  Google-Navigation camera: heading + pitch + close zoom
  // ───────────────────────────────────────────────
  useEffect(() => {
    if (!isMapReady || !location || !mapRef.current) return;

    const isEnRoute =
      status === "en-route-pickup" || status === "en-route-dropoff";

    if (isEnRoute) {
      const rawHeading = location.coords.heading ?? 0;
      const heading = rawHeading >= 0 ? rawHeading : 0;

      // Rider stays exactly at map center — no offset
      const camera: Camera = {
        center: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        heading,
        pitch: 0,
        zoom: NAV_ZOOM,
        altitude: 200,
      };

      mapRef.current.animateCamera(camera, { duration: 1000 });
    }
    // Note: when NOT en-route, we don't auto-move → lets user explore freely
  }, [location, status, isMapReady]);

  // ───────────────────────────────────────────────
  //  Exposed imperative methods
  // ───────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    animateToPickup() {
      if (!pickupCoords || !mapRef.current) return;
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
      if (!location || !mapRef.current) return;
      mapRef.current.animateCamera(
        {
          center: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          zoom: NAV_ZOOM,
          pitch: 0,
          heading: 0,
          altitude: 400,
        },
        { duration: 800 },
      );
    },
  }));

  // ───────────────────────────────────────────────
  //  Render
  // ───────────────────────────────────────────────
  if (mapError) {
    return (
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f5f5f5",
          },
        ]}
      >
        <Text
          style={{
            color: colorScheme === "dark" ? "#fff" : "#000",
            fontSize: 16,
            textAlign: "center",
            paddingHorizontal: 20,
          }}
        >
          ⚠️ Map Error: {mapError}
        </Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f5f5f5",
          },
        ]}
      >
        <Text style={{ color: colorScheme === "dark" ? "#fff" : "#000" }}>
          Loading map...
        </Text>
      </View>
    );
  }

  return (
    <>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyle}
        showsTraffic={false}
        pitchEnabled={true}
        rotateEnabled={true}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: FIXED_LATITUDE_DELTA,
          longitudeDelta: FIXED_LONGITUDE_DELTA,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        onMapReady={() => {
          setIsMapReady(true);
          setMapError(null);
        }}
      >
        {/* Custom rider marker — visible arrow with heading rotation */}
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
          rotation={
            location.coords.heading != null && location.coords.heading >= 0
              ? location.coords.heading
              : 0
          }
          tracksViewChanges
        >
          <View style={styles.riderMarkerWrap}>
            <View
              style={[styles.riderMarkerInner, { backgroundColor: primary }]}
            >
              <IconSymbol name="arrow.up" size={18} color="#fff" />
            </View>
          </View>
        </Marker>

        {/* Accuracy circle */}
        <Circle
          center={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          radius={location.coords.accuracy || 40}
          strokeColor={`${primary}4D`}
          fillColor={`${primary}1A`}
        />

        {/* Live rider → destination route — thick solid blue line */}
        {riderRouteCoords.length > 0 && (
          <>
            {/* Casing / border */}
            <Polyline
              coordinates={riderRouteCoords}
              strokeColor="rgba(255,255,255,0.6)"
              strokeWidth={12}
            />
            {/* Main route line */}
            <Polyline
              coordinates={riderRouteCoords}
              strokeColor={primary}
              strokeWidth={8}
            />
          </>
        )}

        {/* Planned pickup → dropoff route (context) — thinner grey */}
        {plannedRouteCoords.length > 0 &&
          (status === "at-pickup" || status === "en-route-dropoff") && (
            <Polyline
              coordinates={plannedRouteCoords}
              strokeColor={colorScheme === "dark" ? "#666" : "#bbb"}
              strokeWidth={4}
            />
          )}

        {/* Pickup marker */}
        {pickupCoords &&
          (status === "en-route-pickup" || status === "at-pickup") &&
          activeJob && (
            <Marker
              coordinate={pickupCoords}
              title={
                activeJob.jobType === "ride"
                  ? "Pickup Location"
                  : "Vendor Location"
              }
            >
              <IconSymbol
                name={activeJob.jobType === "ride" ? "car" : "storefront"}
                size={28}
                color={success}
              />
            </Marker>
          )}

        {/* Dropoff marker */}
        {dropoffCoords &&
          (status === "at-pickup" || status === "en-route-dropoff") &&
          activeJob && (
            <Marker
              coordinate={dropoffCoords}
              title={
                activeJob.jobType === "ride"
                  ? "Drop-off Location"
                  : "Customer Location"
              }
            >
              <IconSymbol
                name={activeJob.jobType === "ride" ? "car" : "house"}
                size={28}
                color={danger}
              />
            </Marker>
          )}
      </MapView>

      {/* Floating turn-direction icon — compact card, top-left */}
      {currentInstruction ? (
        <View
          style={[
            styles.turnIconCard,
            {
              backgroundColor: colorScheme === "dark" ? "#1E293B" : "#fff",
              shadowColor: "#000",
            },
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

      {/* ETA / distance overlay — only when no turn instruction is active */}
      {!currentInstruction && distanceLeft && eta && activeJob && (
        <View
          style={[
            styles.overlay,
            {
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(0,0,0,0.7)",
            },
          ]}
        >
          <Text
            style={[
              styles.text,
              { color: colorScheme === "dark" ? "#000" : "#fff" },
            ]}
          >
            {activeJob.jobType === "ride"
              ? `${distanceLeft} left`
              : distanceLeft}
          </Text>
          <Text
            style={[
              styles.text,
              { color: colorScheme === "dark" ? "#000" : "#fff" },
            ]}
          >
            ETA {eta}
          </Text>
        </View>
      )}
    </>
  );
});

MapCanvas.displayName = "MapCanvas";

export default MapCanvas;

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    bottom: 60,
    left: 20,
    padding: 10,
    borderRadius: 8,
  },
  text: {
    fontWeight: "600",
  },
  // Rider direction arrow marker
  // Extra padding on the wrap so elevation shadow isn't clipped on Android
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
  // Floating turn icon card
  turnIconCard: {
    position: "absolute",
    top: 120,
    left: 20,
    borderRadius: 16,
    padding: 8,
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
});
