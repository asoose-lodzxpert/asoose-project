import React, { useState, useEffect, useCallback } from "react";
import { View as SkeletonView ,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  Linking,
} from "react-native";

import Toast from "react-native-toast-message";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import { getVehicleInfo, type VehicleInfo } from "@/services/vehicle.service";

const VEHICLES = [
  {
    key: "bicycle",
    label: "Bicycle",
    icon: require("@/assets/vehicles/bicycle.png"),
  },
  {
    key: "motorcycle",
    label: "Motorcycle",
    icon: require("@/assets/vehicles/motorcycle.png"),
  },
  { key: "car", label: "Car", icon: require("@/assets/vehicles/car.png") },
  {
    key: "walking",
    label: "Walking",
    icon: require("@/assets/vehicles/walking.png"),
  },
];

export default function VehicleInfoScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textSecondary = useThemeColor({}, "textSecondary");
  const [data, setData] = useState<VehicleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVehicleInfo = useCallback(async () => {
    try {
      setLoading(true);
      const vehicleData = await getVehicleInfo();
      setData(vehicleData);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load vehicle info",
        text2: error.message || "Please try again",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicleInfo();
  }, [fetchVehicleInfo]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVehicleInfo();
  }, [fetchVehicleInfo]);

  const handleContactAdmin = () => {
    Linking.openURL("mailto:hello@asoose.com");
  };

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, backgroundColor: surface }}>
        <View style={[styles.header, { borderBottomColor: primary + "40" }]}>
          <Pressable onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={primary} />
          </Pressable>
          <ThemedText type="subtitle" style={{ flex: 1, textAlign: "center" }}>
            Vehicle Information
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Field label="Vehicle Type">
            <View style={styles.grid}>
              <SkeletonLoader
                style={[styles.vehicle, { borderColor: primary }]}
              />
            </View>
          </Field>
          <Field label="Brand">
            <SkeletonLoader style={styles.skeletonInput} />
          </Field>
          <Field label="Model">
            <SkeletonLoader style={styles.skeletonInput} />
          </Field>
        </ScrollView>
      </ThemedView>
    );
  }

  // Simple skeleton loader component
  function SkeletonLoader({ style }: { style?: any }) {
    return (
      <SkeletonView
        style={[
          {
            backgroundColor: "#e1e9ee",
            borderRadius: 8,
            minHeight: 44,
            opacity: 0.7,
          },
          style,
        ]}
      />
    );
  }

  // --- Null Data State ---
  if (!data) {
    return (
      <ThemedView style={{ flex: 1, backgroundColor: surface }}>
        <View style={[styles.header, { borderBottomColor: primary + "40" }]}>
          <Pressable onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={primary} />
          </Pressable>
          <ThemedText type="subtitle" style={{ flex: 1, textAlign: "center" }}>
            Vehicle Information
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <IconSymbol
            name="exclamationmark.triangle"
            size={60}
            color={textSecondary}
          />
          <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
            No Vehicle Data Found
          </ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: textSecondary }]}>
            It seems your vehicle profile is incomplete. Please contact our
            admin team to update your details.
          </ThemedText>
          <Pressable
            style={[styles.contactButton, { backgroundColor: primary }]}
            onPress={handleContactAdmin}
          >
            <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
              Contact Admin
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1, backgroundColor: surface }}>
      <View style={[styles.header, { borderBottomColor: primary + "40" }]}>
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <IconSymbol name="chevron.left" size={24} color={primary} />
          <ThemedText
            style={{ color: primary, marginLeft: 4, fontWeight: "500" }}
          >
            Back
          </ThemedText>
        </Pressable>
        <ThemedText type="subtitle" style={{ flex: 1, textAlign: "center" }}>
          Vehicle Information
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primary}
          />
        }
      >
        <Field label="Vehicle Type">
          <View style={styles.grid}>
            {VEHICLES.filter(
              (v) => v.key.toLowerCase() === data.type?.toLowerCase(),
            ).map((v) => (
              <View
                key={v.key}
                style={[styles.vehicle, { borderColor: primary }]}
              >
                <Image source={v.icon} style={styles.vehicleIcon} />
                <ThemedText>{v.label}</ThemedText>
              </View>
            ))}
            {!VEHICLES.some(
              (v) => v.key.toLowerCase() === data.type?.toLowerCase(),
            ) && (
              <View style={[styles.vehicle, { borderColor: primary }]}>
                <ThemedText>{data.type}</ThemedText>
              </View>
            )}
          </View>
        </Field>

        <Field label="Brand">
          <ThemedInput value={data.brand} editable={false} />
        </Field>
        <Field label="Model">
          <ThemedInput value={data.model} editable={false} />
        </Field>
        <Field label="Color">
          <ThemedInput value={data.color} editable={false} />
        </Field>
        <Field label="Year">
          <ThemedInput value={data.year?.toString()} editable={false} />
        </Field>
        <Field label="Plate Number">
          <ThemedInput value={data.plateNumber} editable={false} />
        </Field>
      </ScrollView>
    </ThemedView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  field: { marginTop: 20, gap: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  vehicle: {
    width: "48%",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  vehicleIcon: { width: 40, height: 40, marginBottom: 8 },
  skeletonInput: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#e1e9ee",
    marginTop: 6,
    opacity: 0.7,
  },
  // --- New Empty State Styles ---
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    marginTop: 20,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  contactButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
});
