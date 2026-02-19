import * as Location from "expo-location";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import MapView, {
  Circle,
  LatLng,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getDirections } from "@/services/maps";

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
 * Fixed zoom levels:
 *   - FIXED_*       → normal following / centered view (~600–900 m span)
 *   - ROUTE_VIEW_*  → slightly wider when showing route segment
 */
const FIXED_LATITUDE_DELTA = 0.008;
const FIXED_LONGITUDE_DELTA = 0.008;
const ROUTE_VIEW_LATITUDE_DELTA = 0.013;
const ROUTE_VIEW_LONGITUDE_DELTA = 0.013;

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

  const lastRouteFetchRef = useRef<number>(0);
  const ROUTE_REFETCH_INTERVAL_MS = 20_000;

  const mapStyle = colorScheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

  const pickupCoords = activeJob
    ? resolveCoords(activeJob.pickupAddress)
    : null;
  const dropoffCoords = activeJob
    ? resolveCoords(activeJob.dropoffAddress)
    : null;

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
      const { coordinates, distance, duration, error } = await getDirections({
        originLat: location.coords.latitude,
        originLng: location.coords.longitude,
        destLat: dest.latitude,
        destLng: dest.longitude,
      });

      if (error || !coordinates?.length) return;

      setRiderRouteCoords(coordinates);
      setDistanceLeft(distance.text);
      setEta(duration.text);
    } catch {}
  }, [location, status, activeJob, pickupCoords, dropoffCoords]);

  useEffect(() => {
    if (status === "en-route-pickup" || status === "en-route-dropoff") {
      lastRouteFetchRef.current = 0; // force immediate fetch
      fetchRiderRoute();
    } else {
      setRiderRouteCoords([]);
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
  //  Fixed-zoom camera movement
  // ───────────────────────────────────────────────
  useEffect(() => {
    if (!isMapReady || !location || !mapRef.current) return;

    const isEnRoute =
      status === "en-route-pickup" || status === "en-route-dropoff";

    if (isEnRoute && riderRouteCoords.length > 0) {
      // Show route context → center between rider & destination
      const dest = status === "en-route-pickup" ? pickupCoords : dropoffCoords;
      if (!dest) return;

      const midLat = (location.coords.latitude + dest.latitude) / 2;
      const midLng = (location.coords.longitude + dest.longitude) / 2;

      mapRef.current.animateToRegion(
        {
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: ROUTE_VIEW_LATITUDE_DELTA,
          longitudeDelta: ROUTE_VIEW_LONGITUDE_DELTA,
        },
        1200,
      );
    } else if (isEnRoute) {
      // Following rider (no route yet) – tight zoom
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: FIXED_LATITUDE_DELTA,
          longitudeDelta: FIXED_LONGITUDE_DELTA,
        },
        800,
      );
    }
    // Note: when NOT en-route, we don't auto-move → lets user explore freely
  }, [
    location,
    riderRouteCoords,
    status,
    isMapReady,
    pickupCoords,
    dropoffCoords,
  ]);

  // ───────────────────────────────────────────────
  //  Exposed imperative methods
  // ───────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    animateToPickup() {
      if (!pickupCoords || !mapRef.current) return;
      mapRef.current.animateToRegion(
        {
          ...pickupCoords,
          latitudeDelta: FIXED_LATITUDE_DELTA,
          longitudeDelta: FIXED_LONGITUDE_DELTA,
        },
        1000,
      );
    },

    animateToDropoff() {
      if (!dropoffCoords || !mapRef.current) return;
      mapRef.current.animateToRegion(
        {
          ...dropoffCoords,
          latitudeDelta: FIXED_LATITUDE_DELTA,
          longitudeDelta: FIXED_LONGITUDE_DELTA,
        },
        1000,
      );
    },

    animateToCurrentLocation() {
      if (!location || !mapRef.current) return;
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: FIXED_LATITUDE_DELTA,
          longitudeDelta: FIXED_LONGITUDE_DELTA,
        },
        800,
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
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        onMapReady={() => {
          setIsMapReady(true);
          setMapError(null);
        }}
      >
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

        {/* Live rider → destination route */}
        {riderRouteCoords.length > 0 && (
          <Polyline
            coordinates={riderRouteCoords}
            strokeColor={primary}
            strokeWidth={5}
            lineDashPattern={[0]}
          />
        )}

        {/* Planned pickup → dropoff route (context) */}
        {plannedRouteCoords.length > 0 &&
          (status === "at-pickup" || status === "en-route-dropoff") && (
            <Polyline
              coordinates={plannedRouteCoords}
              strokeColor={colorScheme === "dark" ? "#aaa" : "#999"}
              strokeWidth={3}
              lineDashPattern={[6, 6]}
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

      {/* ETA / distance overlay */}
      {distanceLeft && eta && activeJob && (
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
});
