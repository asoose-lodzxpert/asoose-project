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

const MAX_SIZE = 5 * 1024 * 1024;

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
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const fetchedData: VehicleInfo = {
        vehicleType: "motorcycle",
        make: "Honda",
        model: "CBR",
        color: "Red",
        plateNumber: "ABC-123XY",
        documents: { id: null, license: null, insurance: null },
      };
      setData(fetchedData);
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timeout);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setData((prev) => ({ ...(prev as any) }));
      setRefreshing(false);
    }, 1000);
  }, []);

  const onChange = <K extends keyof VehicleInfo>(
    key: K,
    value: VehicleInfo[K]
  ) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const pickFile = async (key: keyof VehicleInfo["documents"]) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset) return;
    if (asset.size && asset.size > MAX_SIZE) {
      Alert.alert("File too large", "Maximum file size is 5MB");
      return;
    }
    onChange("documents", { ...data!.documents, [key]: asset });
  };

  const removeFile = (key: keyof VehicleInfo["documents"]) => {
    onChange("documents", { ...data!.documents, [key]: null });
  };

  const handleDone = () => {
    // TODO: Save action
    setEditing(false);
  };

  if (loading || !data) {
    return (
      <ThemedView
        style={[styles.loadingContainer, { backgroundColor: surface }]}
      >
        <ThemedText style={{ textAlign: "center", marginTop: 200 }}>
          Loading vehicle information...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1, backgroundColor: surface }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: primary + "40" }]}>
          <Pressable onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={primary} />
          </Pressable>
          <ThemedText type="title" style={{ flex: 1, textAlign: "center" }}>
            Vehicle Information
          </ThemedText>
          {editing ? (
            <Pressable onPress={handleDone}>
              <ThemedText style={{ color: primary, fontWeight: "600" }}>
                Done
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable onPress={() => setEditing(true)}>
              <ThemedText style={{ color: primary, fontWeight: "600" }}>
                Edit
              </ThemedText>
            </Pressable>
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Vehicle Type */}
          <Field label="Vehicle Type">
            <View style={styles.grid}>
              {VEHICLES.map((v) => (
                <Pressable
                  key={v.key}
                  style={[
                    styles.vehicle,
                    data.vehicleType === v.key && { borderColor: primary },
                  ]}
                  onPress={() => editing && onChange("vehicleType", v.key)}
                >
                  <Image source={v.icon} style={styles.vehicleIcon} />
                  <ThemedText>{v.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </Field>

          {/* Make */}
          <Field label="Make">
            <ThemedInput
              placeholder="Honda"
              value={data.make}
              onChangeText={(v) => onChange("make", v)}
              editable={editing}
            />
          </Field>

          {/* Model */}
          <Field label="Model">
            <ThemedInput
              placeholder="CBR"
              value={data.model}
              onChangeText={(v) => onChange("model", v)}
              editable={editing}
            />
          </Field>

          {/* Color */}
          <Field label="Color">
            <ThemedInput
              placeholder="Red"
              value={data.color}
              onChangeText={(v) => onChange("color", v)}
              editable={editing}
            />
          </Field>

          {/* Plate Number */}
          <Field label="Plate Number">
            <ThemedInput
              placeholder="ABC-123XY"
              value={data.plateNumber}
              onChangeText={(v) => onChange("plateNumber", v)}
              editable={editing}
            />
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>
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
