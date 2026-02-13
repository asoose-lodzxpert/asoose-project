import * as Location from "expo-location";
import React, {
  forwardRef,
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

export type MapCanvasHandle = {
  animateToPickup: () => void;
  animateToDropoff: () => void;
};

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
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [distanceLeft, setDistanceLeft] = useState("");
  const [eta, setEta] = useState("");

  // Select map style based on theme
  const mapStyle = colorScheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

  // vehicleRef is not used for animated marker, so can be removed for now

  /** Location tracking */
  useEffect(() => {
    (async () => {
      const { status: permission } =
        await Location.requestForegroundPermissionsAsync();
      if (permission !== "granted") return;

      const current = await Location.getCurrentPositionAsync({});
      setLocation(current);

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (loc) => {
          setLocation(loc);
          mapRef.current?.animateToRegion(
            {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            800,
          );
        },
      );
    })();
  }, []);

  /** Route + ETA */
  useEffect(() => {
    async function fetchRoute() {
      if (!location || !activeJob) return;

      let destination: LatLng | null = null;
      if (status === "en-route-pickup") {
        destination = activeJob.pickupAddress?.coords || {
          latitude: 6.5244,
          longitude: 3.3792,
        };
      } else if (status === "en-route-dropoff") {
        destination = activeJob.dropoffAddress?.coords || {
          latitude: 6.4654,
          longitude: 3.4064,
        };
      } else {
        setRouteCoords([]);
        setDistanceLeft("");
        setEta("");
        return;
      }

      if (!destination) return;
      try {
        const { coordinates, distance, duration, error } = await getDirections({
          originLat: location.coords.latitude,
          originLng: location.coords.longitude,
          destLat: destination.latitude,
          destLng: destination.longitude,
        });

        if (error) {
          console.error("Failed to fetch route:", error);
          return;
        }

        setRouteCoords(coordinates);
        setDistanceLeft(distance.text);
        setEta(duration.text);
      } catch (error) {
        console.error("Error fetching route:", error);
      }
    }

    fetchRoute();
  }, [location, status, activeJob]);

  /** Expose controls */
  useImperativeHandle(ref, () => ({
    animateToPickup() {
      mapRef.current?.animateToRegion(
        {
          latitude: 6.5244,
          longitude: 3.3792,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        800,
      );
    },
    animateToDropoff() {
      mapRef.current?.animateToRegion(
        {
          latitude: 6.4654,
          longitude: 3.4064,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        800,
      );
    },
  }));

  if (!location) return null;

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
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* Accuracy */}
        <Circle
          center={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          radius={location.coords.accuracy || 40}
          strokeColor={`${primary}4D`}
          fillColor={`${primary}1A`}
        />

        {/* Route */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={colorScheme === "dark" ? "#fff" : "#000"}
            strokeWidth={4}
          />
        )}

        {/* Pickup marker (Vendor or Ride origin) */}
        {(status === "en-route-pickup" || status === "en-route-dropoff") &&
          activeJob && (
            <Marker
              coordinate={
                activeJob.pickupAddress?.coords || {
                  latitude: 6.5244,
                  longitude: 3.3792,
                }
              }
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

        {/* Dropoff marker (Customer or Ride destination) */}
        {status === "en-route-dropoff" && activeJob && (
          <Marker
            coordinate={
              activeJob.dropoffAddress?.coords || {
                latitude: 6.4654,
                longitude: 3.4064,
              }
            }
            title={
              activeJob.jobType === "ride"
                ? "Drop-off Location"
                : "Customer Location"
            }
          >
            <IconSymbol
              name={activeJob.jobType === "ride" ? "car" : "home"}
              size={28}
              color={danger}
            />
          </Marker>
        )}
      </MapView>

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

/* ───────── styles ───────── */

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
