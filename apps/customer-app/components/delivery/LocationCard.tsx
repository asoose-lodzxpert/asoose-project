import { View, Pressable, StyleSheet } from "react-native";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

import { SavedAddressPills } from "./SavedAddressPills";
import { LocationDetailsForm } from "./LocationDetailsForm";
import { useSendPackage } from "@/context/SendPackageContext";

type Props = {
  type: "pickup" | "delivery";
  title: string;
};

export function LocationCard({ type, title }: Props) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const router = useRouter();
  const { pickup, dropoff } = useSendPackage();

  const primary = useThemeColor({}, "brandPrimary");
  const success = useThemeColor({}, "statusSuccess");
  const card = useThemeColor({}, "surfaceCard");
  const danger = useThemeColor({}, "statusError");
  const muted = useThemeColor({}, "textMuted");

  const isPickup = type === "pickup";

  const config = useMemo(() => {
    const location = isPickup ? pickup : dropoff;

    return {
      location,
      iconColor: isPickup ? success : danger,
      detailsLabel: isPickup
        ? "Add pickup details *"
        : "Add recipient details *",
      emptyLabel: "Select location",
    };
  }, [isPickup, pickup, dropoff, success, danger]);

  const handleLocationSelect = () => {
    // Navigate to the route-based picker screen and pass the type as a query param
    // (using a string URL ensures the param is available via useLocalSearchParams)
    router.push(`/location-picker?type=${type}`);
  };

  const toggleDetails = () => {
    setIsDetailsOpen((prev) => !prev);
  };

  const address = config.location?.address?.fullAddress;

  return (
    <View style={[styles.card, { backgroundColor: card }]}>
      {/* ---------- Location Header ---------- */}
      <Pressable onPress={handleLocationSelect}>
        <View style={styles.titleRow}>
          <IconSymbol name="location.fill" size={18} color={config.iconColor} />
          <ThemedText type="subtitle">{title}</ThemedText>
        </View>

        <ThemedText type="default" style={[styles.address, { color: muted }]}>
          {address ?? config.emptyLabel}
        </ThemedText>
      </Pressable>

      {/* ---------- Saved Addresses ---------- */}
      <SavedAddressPills type={type} />

      {/* ---------- Details Toggle ---------- */}
      {!isPickup && (
        <Pressable onPress={toggleDetails} style={styles.detailsRow}>
          <View style={styles.detailsLeft}>
            <ThemedText type="link">{config.detailsLabel}</ThemedText>
            <IconSymbol name="chevron.right" size={14} color={primary} />
          </View>

          <IconSymbol
            name={isDetailsOpen ? "chevron.up" : "chevron.down"}
            size={16}
            color={primary}
          />
        </Pressable>
      )}

      {/* ---------- Conditional Details ---------- */}
      {isDetailsOpen && !isPickup && <LocationDetailsForm type={type} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  address: {
    marginVertical: 8,
    fontSize: 18,
  },

  detailsRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  detailsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
