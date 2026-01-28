import * as Location from "expo-location";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Circle, LatLng, Marker, Polyline } from "react-native-maps";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useJobs } from "@/context/JobContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getDirections } from "@/services/maps";

export type MapCanvasHandle = {
  animateToPickup: () => void;
  animateToDropoff: () => void;
};

const MapCanvas = forwardRef<MapCanvasHandle>((_, ref) => {
  const mapRef = useRef<MapView>(null);
  const { activeJob, status } = useJobs();
  const primary = useThemeColor({}, "brandPrimary");

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [distanceLeft, setDistanceLeft] = useState("");
  const [eta, setEta] = useState("");

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
        provider="google"
        mapType="standard"
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
      >
        {/* Accuracy */}
        <Circle
          center={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          radius={location.coords.accuracy || 40}
          strokeColor="rgba(59,130,246,0.3)"
          fillColor="rgba(59,130,246,0.1)"
        />

        {/* Route */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#3B82F6"
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
                color={primary}
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
              color={primary}
            />
          </Marker>
        )}

        {/* Vehicle */}
        {/* <Marker.Animated coordinate={vehicleRef as any}>
          <IconSymbol name="navigation" size={32} color={primary} />
        </Marker.Animated> */}
      </MapView>

      {distanceLeft && eta && activeJob && (
        <View style={styles.overlay}>
          <Text style={styles.text}>
            {activeJob.jobType === "ride"
              ? `${distanceLeft} left`
              : distanceLeft}
          </Text>
          <Text style={styles.text}>ETA {eta}</Text>
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
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 8,
  },
  text: {
    color: "#fff",
    fontWeight: "600",
  },
});
