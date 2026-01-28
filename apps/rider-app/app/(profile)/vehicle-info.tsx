import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";

type VehicleInfo = {
  vehicleType: string | null;
  make: string;
  model: string;
  color: string;
  plateNumber: string;
  documents: {
    id: any;
    license: any;
    insurance: any;
  };
};

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
  const [data, setData] = useState<VehicleInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading and fetch data
    setTimeout(() => {
      setData({
        vehicleType: "motorcycle",
        make: "Honda",
        model: "CBR",
        color: "Red",
        plateNumber: "ABC-123XY",
        documents: { id: null, license: null, insurance: null },
      });
      setLoading(false);
    }, 1200);
  }, []);

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
              <View
                style={[
                  styles.vehicle,
                  { borderColor: primary, backgroundColor: "#F3F4F6" },
                ]}
              />
            </View>
          </Field>
          <Field label="Make">
            <View
              style={{
                height: 44,
                borderRadius: 8,
                backgroundColor: "#F3F4F6",
                marginTop: 6,
              }}
            />
          </Field>
          <Field label="Model">
            <View
              style={{
                height: 44,
                borderRadius: 8,
                backgroundColor: "#F3F4F6",
                marginTop: 6,
              }}
            />
          </Field>
          <Field label="Color">
            <View
              style={{
                height: 44,
                borderRadius: 8,
                backgroundColor: "#F3F4F6",
                marginTop: 6,
              }}
            />
          </Field>
          <Field label="Plate Number">
            <View
              style={{
                height: 44,
                borderRadius: 8,
                backgroundColor: "#F3F4F6",
                marginTop: 6,
              }}
            />
          </Field>
        </ScrollView>
      </ThemedView>
    );
  }

  if (!data) return null;

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
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Field label="Vehicle Type">
          <View style={styles.grid}>
            {VEHICLES.filter((v) => v.key === data.vehicleType).map((v) => (
              <View
                key={v.key}
                style={[styles.vehicle, { borderColor: primary }]}
              >
                <Image source={v.icon} style={styles.vehicleIcon} />
                <ThemedText>{v.label}</ThemedText>
              </View>
            ))}
          </View>
        </Field>
        <Field label="Make">
          <ThemedInput placeholder="Honda" value={data.make} editable={false} />
        </Field>
        <Field label="Model">
          <ThemedInput placeholder="CBR" value={data.model} editable={false} />
        </Field>
        <Field label="Color">
          <ThemedInput placeholder="Red" value={data.color} editable={false} />
        </Field>
        <Field label="Plate Number">
          <ThemedInput
            placeholder="ABC-123XY"
            value={data.plateNumber}
            editable={false}
          />
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
  section: { gap: 8, marginTop: 12 },
  hintText: { fontSize: 12, textAlign: "center", color: "#9CA3AF" },
  removeButton: { marginTop: 6 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
