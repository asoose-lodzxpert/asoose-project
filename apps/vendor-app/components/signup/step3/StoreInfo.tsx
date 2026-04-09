import React, { useEffect, useState } from "react";
import { ThemedInput } from "@/components/ThemedInput";
import { Field } from "./Field";
import { Step3Props } from "./types";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";

type CityItem = { id: string; name: string; state: string };

export const StoreInfo: React.FC<Step3Props> = ({ data, onChange }) => {
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const borderColor = useThemeColor({}, "borderDefault");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const textMuted = useThemeColor({}, "textMuted");
  const surfaceError = useThemeColor({}, "statusError");

  const [cities, setCities] = useState<CityItem[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchCities();
  }, []);

  async function fetchCities() {
    try {
      setLoadingCities(true);
      const API = process.env.EXPO_PUBLIC_API_URL;
      const res = await fetch(`${API}/maps/active-locations`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Handle both [{name, state}] and [{id, name, state}] shapes
      setCities(data as CityItem[]);
    } catch {
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }

  const selectedCity = cities.find((c) => c.id === data.cityId || c.name === data.cityName);

  return (
    <>
      <Field label="Store Display Name" required={true}>
        <ThemedInput
          value={data.storeName}
          placeholder="Enter store display name"
          onChangeText={(v) => onChange("storeName", v)}
        />
      </Field>

      <Field label="Store Description" required={true}>
        <ThemedInput
          multiline
          maxLength={150}
          value={data.storeDescription}
          placeholder="Enter store description"
          onChangeText={(v) => onChange("storeDescription", v)}
        />
      </Field>

      {/* City Picker */}
      <Field label="Service City" required={true}>
        <Pressable
          onPress={() => setDropdownOpen((v) => !v)}
          style={[
            styles.cityButton,
            {
              borderColor: data.cityId ? brandPrimary : borderColor,
              backgroundColor: surfaceCard,
            },
          ]}
        >
          <View style={styles.cityButtonInner}>
            <IconSymbol
              name="location.fill"
              size={16}
              color={data.cityId ? brandPrimary : textMuted}
            />
            {loadingCities ? (
              <ActivityIndicator size="small" color={brandPrimary} />
            ) : (
              <ThemedText
                style={[
                  styles.cityButtonText,
                  { color: data.cityId ? brandPrimary : textMuted },
                ]}
              >
                {selectedCity
                  ? `${selectedCity.name}, ${selectedCity.state}`
                  : "Select your service city"}
              </ThemedText>
            )}
          </View>
          <IconSymbol
            name={dropdownOpen ? "chevron.up" : "chevron.down"}
            size={14}
            color={textMuted}
          />
        </Pressable>

        {/* Dropdown */}
        {dropdownOpen && (
          <View
            style={[
              styles.dropdown,
              { backgroundColor: surfaceCard, borderColor },
            ]}
          >
            {cities.length === 0 ? (
              <ThemedText style={[styles.dropdownEmpty, { color: textMuted }]}>
                No active cities available
              </ThemedText>
            ) : (
              cities.map((city) => (
                <Pressable
                  key={city.id || city.name}
                  onPress={() => {
                    onChange("cityId", city.id || city.name);
                    onChange("cityName", city.name);
                    setDropdownOpen(false);
                  }}
                  style={[
                    styles.dropdownItem,
                    { borderColor },
                    (data.cityId === city.id || data.cityName === city.name) && {
                      backgroundColor: brandPrimary + "15",
                    },
                  ]}
                >
                  <ThemedText style={styles.dropdownItemName}>
                    {city.name}
                  </ThemedText>
                  <ThemedText style={[styles.dropdownItemState, { color: textMuted }]}>
                    {city.state}
                  </ThemedText>
                </Pressable>
              ))
            )}
          </View>
        )}

        <ThemedText style={[styles.hint, { color: textMuted }]}>
          Select the city where your store operates. Orders and rides are only
          available in active cities.
        </ThemedText>
      </Field>
    </>
  );
};

const styles = StyleSheet.create({
  cityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  cityButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  cityButtonText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: "700",
  },
  dropdownItemState: {
    fontSize: 12,
    fontWeight: "500",
  },
  dropdownEmpty: {
    padding: 16,
    textAlign: "center",
    fontSize: 13,
  },
  hint: {
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
});
