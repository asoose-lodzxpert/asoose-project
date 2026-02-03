import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRide } from "@/context/RideContext";
import { useLocation } from "@/context/LocationContext";

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

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
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

      <ScrollView style={styles.scrollView}>
        {/* Current Location */}
        {currentLocation && (
          <Pressable
            onPress={handleUseCurrentLocation}
            style={[styles.locationItem, { backgroundColor: card, borderColor: border }]}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${success}20` }]}>
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

        {/* Sample Locations */}
        <ThemedText type="caption" style={[styles.sectionTitle, { color: textSecondary }]}>
          Popular Locations
        </ThemedText>

        {sampleLocations
          .filter((loc) =>
            loc.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((loc, index) => (
            <Pressable
              key={index}
              onPress={() => handleSelectLocation(loc.name, loc.lat, loc.lng)}
              style={[styles.locationItem, { backgroundColor: card, borderColor: border }]}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${primary}15` }]}>
                <IconSymbol name="mappin" size={20} color={primary} />
              </View>
              <View style={styles.locationInfo}>
                <ThemedText type="defaultSemiBold">{loc.name}</ThemedText>
                <ThemedText type="caption" style={{ color: textSecondary }}>
                  Lagos, Nigeria
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={textSecondary} />
            </Pressable>
          ))}
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
});
