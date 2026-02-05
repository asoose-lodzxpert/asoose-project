import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRide } from "@/context/RideContext";
import { useLocation } from "@/context/LocationContext";
import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAP_HEIGHT = SCREEN_HEIGHT * 0.35;

export default function LocationPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const type = params.type as "pickup" | "dropoff";

  const { setPickupLocation, setDropoffLocation } = useRide();
  const { location: currentLocation } = useLocation();

  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<
    { id: string; title: string; subtitle: string }[]
  >([]);
  const [selectedMarker, setSelectedMarker] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: currentLocation?.coords?.latitude || 6.5244,
    longitude: currentLocation?.coords?.longitude || 3.3792,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [reverseGeocodedAddress, setReverseGeocodedAddress] = useState("");
  const [gettingPlaceDetails, setGettingPlaceDetails] = useState(false);
  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced autocomplete search
  const searchPlaces = useCallback(
    async (query: string) => {
      if (!query || query.length < 3) {
        setAutocompleteResults([]);
        return;
      }

      setSearching(true);
      try {
        const location = currentLocation?.coords
          ? `${currentLocation.coords.latitude},${currentLocation.coords.longitude}`
          : undefined;

        const params: any = { query };
        if (location) params.location = location;

        const response = await axios.get(
          `${API_URL}/maps/places-autocomplete`,
          {
            params,
          },
        );
        setAutocompleteResults(response.data || []);
      } catch (error) {
        console.error("Autocomplete error:", error);
        setAutocompleteResults([]);
      } finally {
        setSearching(false);
      }
    },
    [currentLocation],
  );

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchPlaces]);

  // Reverse geocode when marker is moved
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (results && results.length > 0) {
        const result = results[0];
        const address = [result.name, result.street, result.city, result.region]
          .filter(Boolean)
          .join(", ");
        setReverseGeocodedAddress(address || "Selected Location");
      }
    } catch (error) {
      console.error("Reverse geocode error:", error);
      setReverseGeocodedAddress("Selected Location");
    }
  }, []);

  // Handle map marker drag or tap
  const handleMapPress = useCallback(
    (event: any) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      setSelectedMarker({ latitude, longitude });
      reverseGeocode(latitude, longitude);
    },
    [reverseGeocode],
  );

  // Get place details from place_id
  const getPlaceDetails = useCallback(
    async (placeId: string, title: string, subtitle: string) => {
      setGettingPlaceDetails(true);
      try {
        // Use geocoding to get coordinates from place ID
        const response = await axios.get(`${API_URL}/maps/geocode`, {
          params: { placeId },
        });

        if (response.data && response.data.lat && response.data.lng) {
          const location = {
            latitude: response.data.lat,
            longitude: response.data.lng,
            address: subtitle ? `${title}, ${subtitle}` : title,
          };

          if (type === "pickup") {
            setPickupLocation(location);
          } else {
            setDropoffLocation(location);
          }

          router.back();
        }
      } catch (error) {
        console.error("Place details error:", error);
        // Fallback: just use the address without coordinates
        const location = {
          latitude: 0,
          longitude: 0,
          address: subtitle ? `${title}, ${subtitle}` : title,
        };

        if (type === "pickup") {
          setPickupLocation(location);
        } else {
          setDropoffLocation(location);
        }

        router.back();
      } finally {
        setGettingPlaceDetails(false);
      }
    },
    [type, setPickupLocation, setDropoffLocation, router],
  );

  const handleUseCurrentLocation = () => {
    if (currentLocation?.coords) {
      const location = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address: currentLocation.address || "Current Location",
      };

      if (type === "pickup") {
        setPickupLocation(location);
      } else {
        setDropoffLocation(location);
      }

      router.back();
    }
  };

  const handleSelectLocation = (address: string, lat: number, lng: number) => {
    const location = {
      latitude: lat,
      longitude: lng,
      address,
    };

    if (type === "pickup") {
      setPickupLocation(location);
    } else {
      setDropoffLocation(location);
    }

    router.back();
  };

  const handleConfirmMapSelection = () => {
    if (selectedMarker) {
      const location = {
        latitude: selectedMarker.latitude,
        longitude: selectedMarker.longitude,
        address: reverseGeocodedAddress || "Selected Location",
      };

      if (type === "pickup") {
        setPickupLocation(location);
      } else {
        setDropoffLocation(location);
      }

      router.back();
    }
  };

  // Sample locations (in production, integrate with Google Places API)
  const sampleLocations = [
    { name: "Lekki Phase 1", lat: 6.4474, lng: 3.4742 },
    { name: "Victoria Island", lat: 6.4281, lng: 3.4219 },
    { name: "Ikeja City Mall", lat: 6.6018, lng: 3.3515 },
    { name: "Yaba", lat: 6.5134, lng: 3.3711 },
    { name: "Surulere", lat: 6.4969, lng: 3.3611 },
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </Pressable>
        <ThemedText type="subtitle">
          {type === "pickup" ? "Pickup Location" : "Dropoff Location"}
        </ThemedText>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: card }]}>
        <IconSymbol name="magnifyingglass" size={20} color={textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: textSecondary }]}
          placeholder="Search location..."
          placeholderTextColor={textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
        {searching && <ActivityIndicator size="small" color={primary} />}
      </View>

      {/* Interactive Map */}
      <View style={[styles.mapContainer, { borderColor: border }]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={mapRegion}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {selectedMarker && (
            <Marker
              coordinate={selectedMarker}
              draggable
              onDragEnd={handleMapPress}
              pinColor={primary}
            />
          )}
        </MapView>

        {selectedMarker && (
          <View style={[styles.mapOverlay, { backgroundColor: card }]}>
            <View style={styles.mapOverlayContent}>
              <IconSymbol name="mappin" size={20} color={primary} />
              <ThemedText
                type="caption"
                style={{ flex: 1, color: textSecondary }}
              >
                {reverseGeocodedAddress || "Getting address..."}
              </ThemedText>
            </View>
            <Pressable
              onPress={handleConfirmMapSelection}
              style={[styles.confirmButton, { backgroundColor: primary }]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
                Confirm
              </ThemedText>
            </Pressable>
          </View>
        )}

        <ThemedText
          type="caption"
          style={[styles.mapHint, { color: textSecondary }]}
        >
          Tap on map to select location
        </ThemedText>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Current Location */}
        {currentLocation && !searchQuery && (
          <Pressable
            onPress={handleUseCurrentLocation}
            style={[
              styles.locationItem,
              { backgroundColor: card, borderColor: border },
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${success}20` },
              ]}
            >
              <IconSymbol name="location.fill" size={20} color={success} />
            </View>
            <View style={styles.locationInfo}>
              <ThemedText type="defaultSemiBold">Current Location</ThemedText>
              <ThemedText type="caption" style={{ color: textSecondary }}>
                {currentLocation.address || "Your current position"}
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={20} color={textSecondary} />
          </Pressable>
        )}

        {/* Loading State */}
        {searching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={primary} />
            <ThemedText
              type="caption"
              style={{ color: textSecondary, marginLeft: 8 }}
            >
              Searching...
            </ThemedText>
          </View>
        )}

        {/* Place Details Loading */}
        {gettingPlaceDetails && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={primary} />
            <ThemedText
              type="caption"
              style={{ color: textSecondary, marginLeft: 8 }}
            >
              Getting location details...
            </ThemedText>
          </View>
        )}

        {/* Autocomplete Results */}
        {!searching && autocompleteResults.length > 0 && (
          <>
            <ThemedText
              type="caption"
              style={[styles.sectionTitle, { color: textSecondary }]}
            >
              Search Results
            </ThemedText>
            {autocompleteResults.map((place) => (
              <Pressable
                key={place.id}
                onPress={() =>
                  getPlaceDetails(place.id, place.title, place.subtitle)
                }
                style={[
                  styles.locationItem,
                  { backgroundColor: card, borderColor: border },
                ]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${primary}15` },
                  ]}
                >
                  <IconSymbol name="mappin" size={20} color={primary} />
                </View>
                <View style={styles.locationInfo}>
                  <ThemedText type="defaultSemiBold">{place.title}</ThemedText>
                  <ThemedText type="caption" style={{ color: textSecondary }}>
                    {place.subtitle}
                  </ThemedText>
                </View>
                <IconSymbol
                  name="chevron.right"
                  size={20}
                  color={textSecondary}
                />
              </Pressable>
            ))}
          </>
        )}

        {/* No Results */}
        {!searching &&
          searchQuery.length >= 3 &&
          autocompleteResults.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol
                name="magnifyingglass"
                size={48}
                color={textSecondary}
              />
              <ThemedText
                type="caption"
                style={{ color: textSecondary, marginTop: 8 }}
              >
                No locations found
              </ThemedText>
            </View>
          )}

        {/* Sample Locations - shown when no search */}
        {!searchQuery && !searching && autocompleteResults.length === 0 && (
          <>
            <ThemedText
              type="caption"
              style={[styles.sectionTitle, { color: textSecondary }]}
            >
              Popular Locations
            </ThemedText>

            {sampleLocations.map((loc, index) => (
              <Pressable
                key={index}
                onPress={() => handleSelectLocation(loc.name, loc.lat, loc.lng)}
                style={[
                  styles.locationItem,
                  { backgroundColor: card, borderColor: border },
                ]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${primary}15` },
                  ]}
                >
                  <IconSymbol name="mappin" size={20} color={primary} />
                </View>
                <View style={styles.locationInfo}>
                  <ThemedText type="defaultSemiBold">{loc.name}</ThemedText>
                  <ThemedText type="caption" style={{ color: textSecondary }}>
                    Lagos, Nigeria
                  </ThemedText>
                </View>
                <IconSymbol
                  name="chevron.right"
                  size={20}
                  color={textSecondary}
                />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  locationInfo: {
    flex: 1,
  },
  mapContainer: {
    height: MAP_HEIGHT,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapHint: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 16,
    color: "#fff",
    fontSize: 12,
  },
  mapOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mapOverlayContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  confirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
});
