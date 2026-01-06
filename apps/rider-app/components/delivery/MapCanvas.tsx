import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, {
  Circle,
  Polyline,
  Marker,
  AnimatedRegion,
  LatLng,
} from "react-native-maps";
import * as Location from "expo-location";
import axios from "axios";
import polyline from "@mapbox/polyline";

import { Keys } from "@/config/keys";
import { useDelivery } from "@/context/DeliveryContext";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

export type MapCanvasHandle = {
  animateToPickup: () => void;
  animateToDropoff: () => void;
};

const MapCanvas = forwardRef<MapCanvasHandle>((_, ref) => {
  const mapRef = useRef<MapView>(null);
  const { status } = useDelivery();
  const primary = useThemeColor({}, "brandPrimary");

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [distanceLeft, setDistanceLeft] = useState("");
  const [eta, setEta] = useState("");

  const vehicleRef = useRef(
    new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current;

  /** Location tracking */
  useEffect(() => {
    (async () => {
      const { status: permission } =
        await Location.requestForegroundPermissionsAsync();
      if (permission !== "granted") return;

      const current = await Location.getCurrentPositionAsync({});
      setLocation(current);

      vehicleRef.setValue({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0,
        longitudeDelta: 0,
      });

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
            800
          );

          (vehicleRef as any)
            .timing({
              toValue: {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0,
                longitudeDelta: 0,
              },
              duration: 1000,
              useNativeDriver: false,
            })
            .start();
        }
      );
    })();
  }, []);

  /** Route + ETA */
  useEffect(() => {
    async function fetchRoute() {
      if (!location) return;

      let destination: LatLng | null = null;

      if (status === "en-route-pickup") destination = Keys.VENDOR_COORD;
      else if (status === "en-route-dropoff") destination = Keys.CUSTOMER_COORD;
      else {
        setRouteCoords([]);
        setDistanceLeft("");
        setEta("");
        return;
      }

      const { coordinates, distance, duration } = await getRouteData(
        location.coords,
        destination,
        Keys.GOOGLE_MAPS_API_KEY
      );

      setRouteCoords(coordinates);
      setDistanceLeft(distance.text);
      setEta(duration.text);
    }

    fetchRoute();
  }, [location, status]);

  /** Expose controls */
  useImperativeHandle(ref, () => ({
    animateToPickup() {
      mapRef.current?.animateToRegion(
        { ...Keys.VENDOR_COORD, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        800
      );
    },
    animateToDropoff() {
      mapRef.current?.animateToRegion(
        { ...Keys.CUSTOMER_COORD, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        800
      );
    },
  }));

  if (!location) return null;

  return (
    <>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
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

        {/* Vendor marker */}
        {(status === "en-route-pickup" || status === "en-route-dropoff") && (
          <Marker coordinate={Keys.VENDOR_COORD} title="Pickup Location">
            <IconSymbol name="storefront" size={28} color={primary} />
          </Marker>
        )}

        {/* Customer marker */}
        {status === "en-route-dropoff" && (
          <Marker coordinate={Keys.CUSTOMER_COORD} title="Drop-off Location">
            <IconSymbol name="home" size={28} color={primary} />
          </Marker>
        )}

        {/* Vehicle */}
        <Marker.Animated coordinate={vehicleRef as any}>
          <IconSymbol name="navigation" size={32} color={primary} />
        </Marker.Animated>
      </MapView>

      {distanceLeft && eta && (
        <View style={styles.overlay}>
          <Text style={styles.text}>{distanceLeft}</Text>
          <Text style={styles.text}>ETA {eta}</Text>
        </View>
      )}
    </>
  );
});

export default MapCanvas;

/* ───────── helpers ───────── */

async function getRouteData(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  apiKey: string
) {
  const res = await axios.get(
    `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}&mode=driving`
  );

  const route = res.data.routes[0];
  const points: LatLng[] = polyline
    .decode(route.overview_polyline.points)
    .map(([lat, lng]: [number, number]) => ({ latitude: lat, longitude: lng }));

  return {
    coordinates: points,
    distance: route.legs[0].distance,
    duration: route.legs[0].duration,
  };
}

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
