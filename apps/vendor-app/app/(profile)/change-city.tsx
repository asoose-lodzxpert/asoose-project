import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { fetchWithAuth } from "@/services/auth-fetch";

type CityItem = { id: string; name: string; state: string };

const API = process.env.EXPO_PUBLIC_API_URL;

export default function ChangeCityScreen() {
  const router = useRouter();
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const surfaceBackground = useThemeColor({}, "surfaceBackground");
  const borderColor = useThemeColor({}, "borderDefault");
  const textMuted = useThemeColor({}, "textMuted");
  const statusSuccess = useThemeColor({}, "statusSuccess");
  const statusError = useThemeColor({}, "statusError");

  const [cities, setCities] = useState<CityItem[]>([]);
  const [currentCityId, setCurrentCityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      // Fetch active cities and current store info in parallel
      const [citiesRes, storeRes] = await Promise.all([
        fetchWithAuth(`${API}/vendor/dashboard/cities`),
        fetchWithAuth(`${API}/vendor/dashboard/public`),
      ]);
      setCities(citiesRes || []);
      const cId = storeRes?.cityId || null;
      setCurrentCityId(cId);
      setSelectedId(cId);
    } catch {
      Toast.show({ type: "error", text1: "Failed to load cities" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedId || selectedId === currentCityId) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      await fetchWithAuth(`${API}/vendor/dashboard/city`, {
        method: "PATCH",
        body: JSON.stringify({ cityId: selectedId }),
      });
      const city = cities.find((c) => c.id === selectedId);
      Toast.show({
        type: "success",
        text1: "City Updated",
        text2: `Your store is now registered in ${city?.name}.`,
      });
      setTimeout(() => router.back(), 800);
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: e.message || "Could not update city",
      });
    } finally {
      setSaving(false);
    }
  }

  // Group cities by state
  const grouped = cities.reduce<Record<string, CityItem[]>>((acc, city) => {
    if (!acc[city.state]) acc[city.state] = [];
    acc[city.state].push(city);
    return acc;
  }, {});

  return (
    <ThemedView style={[styles.container, { backgroundColor: surfaceBackground }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: surfaceCard }]}
        >
          <IconSymbol name="chevron.left" size={20} color={brandPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <ThemedText style={[styles.headerSub, { color: textMuted }]}>
            Store Settings
          </ThemedText>
          <ThemedText style={styles.headerTitle}>Change City</ThemedText>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brandPrimary} />
          <ThemedText style={[styles.loadingText, { color: textMuted }]}>
            Loading cities...
          </ThemedText>
        </View>
      ) : (
        <>
          <ThemedText style={[styles.hint, { color: textMuted }]}>
            Select the city where your store operates. Only orders in this city
            will be visible to your store.
          </ThemedText>

          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([state, stateCities]) => (
                <View key={state}>
                  {/* State header */}
                  <ThemedText
                    style={[styles.stateLabel, { color: textMuted }]}
                  >
                    {state}
                  </ThemedText>

                  {/* Cities in this state */}
                  {stateCities.map((city) => {
                    const isSelected = selectedId === city.id;
                    const isCurrent = currentCityId === city.id;
                    return (
                      <Pressable
                        key={city.id}
                        onPress={() => setSelectedId(city.id)}
                        style={[
                          styles.cityRow,
                          {
                            backgroundColor: surfaceCard,
                            borderColor: isSelected
                              ? brandPrimary
                              : borderColor,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                      >
                        <View style={styles.cityRowLeft}>
                          <View
                            style={[
                              styles.radio,
                              {
                                borderColor: isSelected
                                  ? brandPrimary
                                  : borderColor,
                                backgroundColor: isSelected
                                  ? brandPrimary
                                  : "transparent",
                              },
                            ]}
                          >
                            {isSelected && (
                              <IconSymbol
                                name="checkmark"
                                size={10}
                                color="#fff"
                              />
                            )}
                          </View>
                          <ThemedText style={styles.cityName}>
                            {city.name}
                          </ThemedText>
                          {isCurrent && (
                            <View
                              style={[
                                styles.currentBadge,
                                { backgroundColor: statusSuccess + "20" },
                              ]}
                            >
                              <ThemedText
                                style={[
                                  styles.currentBadgeText,
                                  { color: statusSuccess },
                                ]}
                              >
                                Current
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <IconSymbol
                          name="location.fill"
                          size={14}
                          color={isSelected ? brandPrimary : textMuted}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              ))}

            {cities.length === 0 && (
              <View style={styles.center}>
                <ThemedText style={{ color: textMuted }}>
                  No active cities available yet.
                </ThemedText>
              </View>
            )}
          </ScrollView>

          {/* Save Button */}
          <View
            style={[
              styles.footer,
              { backgroundColor: surfaceCard, borderTopColor: borderColor },
            ]}
          >
            <Pressable
              style={[
                styles.saveButton,
                {
                  backgroundColor:
                    selectedId && selectedId !== currentCityId
                      ? brandPrimary
                      : borderColor,
                },
              ]}
              onPress={handleSave}
              disabled={saving || !selectedId}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.saveButtonText}>
                  {selectedId === currentCityId ? "No Changes" : "Save City"}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  headerSub: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  hint: {
    fontSize: 13,
    marginHorizontal: 20,
    marginBottom: 16,
    lineHeight: 18,
  },
  list: { paddingHorizontal: 20, paddingBottom: 120, gap: 4 },
  stateLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 8,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 6,
  },
  cityRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cityName: { fontSize: 15, fontWeight: "700", flex: 1 },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  loadingText: { fontSize: 13, marginTop: 8 },
});
