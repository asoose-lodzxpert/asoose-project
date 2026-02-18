import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { SignupForm, VehicleType } from "@/types/signup";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

type Props = {
  data: SignupForm;
  onChange: <K extends keyof SignupForm>(key: K, value: SignupForm[K]) => void;
};

// const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const VEHICLES: { key: VehicleType; label: string; icon: IconSymbolName }[] = [
  {
    key: "bicycle",
    label: "Bicycle",
    icon: "bicycle",
  },
  {
    key: "motorcycle",
    label: "Motorcycle",
    icon: "motorcycle",
  },
  { key: "car", label: "Car", icon: "car" },
  {
    key: "walking",
    label: "Walking",
    icon: "directions-walk",
  },
];

export function StepVehicleInfo({ data, onChange }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const [uploading, setUploading] = useState<string | null>(null);

  // Filter vehicles based on role and state
  const availableVehicles = VEHICLES.filter((vehicle) => {
    // If role is DRIVER, only show car
    if (data.role === "DRIVER") {
      return vehicle.key === "car";
    }

    // If state is Borno, exclude motorcycle
    if (data.state === "Borno") {
      return vehicle.key !== "motorcycle";
    }

    return true;
  });

  // Determine required documents based on vehicle type
  const getRequiredDocuments = () => {
    const docs: {
      key: keyof SignupForm["documents"];
      label: string;
    }[] = [{ key: "idCard", label: "ID Document (National ID/Passport)" }];

    if (!data.vehicleType || data.vehicleType === "walking") {
      return docs;
    }

    if (data.vehicleType === "bicycle") {
      // Bicycle doesn't need driver's license
      return docs;
    }

    // Motorcycle and Car need all documents
    if (data.vehicleType === "motorcycle" || data.vehicleType === "car") {
      docs.push(
        { key: "driverLicense", label: "Driver's License" },
        { key: "vehicleInsurance", label: "Vehicle Insurance" },
        { key: "vehicleRegistration", label: "Vehicle Registration" },
      );
    }

    return docs;
  };

  const requiredDocuments = getRequiredDocuments();

  const pickImage = async (key: keyof SignupForm["documents"]) => {
    try {
      setUploading(key);

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll permissions to upload documents.",
        );
        setUploading(null);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (result.canceled) {
        setUploading(null);
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setUploading(null);
        return;
      }

      // Store the URI as the document value
      onChange("documents", {
        ...data.documents,
        [key]: asset.uri,
      });

      setUploading(null);
    } catch (error) {
      // ...existing code...
      Alert.alert("Error", "Failed to pick image");
      setUploading(null);
    }
  };

  const removeFile = (key: keyof SignupForm["documents"]) => {
    onChange("documents", {
      ...data.documents,
      [key]: null,
    });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Vehicle Type */}
      <Field label="Vehicle type">
        <View style={styles.grid}>
          {availableVehicles.map((v) => (
            <Pressable
              key={v.key}
              style={[
                styles.vehicle,
                data.vehicleType === v.key && { borderColor: primary },
              ]}
              onPress={() => onChange("vehicleType", v.key)}
            >
              <IconSymbol
                name={v.icon}
                size={40}
                style={styles.vehicleIcon}
                color={primary}
              />
              <ThemedText>{v.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </Field>

      {/* Make */}
      <Field label="Make">
        <ThemedInput
          placeholder="Toyota"
          value={data.make}
          onChangeText={(v) => onChange("make", v)}
        />
      </Field>

      {/* Model */}
      <Field label="Model">
        <ThemedInput
          placeholder="Corolla"
          value={data.model}
          onChangeText={(v) => onChange("model", v)}
        />
      </Field>

      {/* Year */}
      <Field label="Year">
        <ThemedInput
          placeholder="2020"
          value={data.year}
          onChangeText={(v) => onChange("year", v)}
          keyboardType="number-pad"
          maxLength={4}
        />
      </Field>

      {/* Color */}
      <Field label="Color">
        <ThemedInput
          placeholder="White"
          value={data.color}
          onChangeText={(v) => onChange("color", v)}
        />
      </Field>

      {/* Plate Number */}
      <Field label="Plate number">
        <ThemedInput
          placeholder="ABC-123XY"
          value={data.plateNumber}
          onChangeText={(v) => onChange("plateNumber", v)}
        />
      </Field>

      {/* Document Uploads */}
      <Field label="Upload Documents">
        {requiredDocuments.map(({ key, label }) => {
          const file = data.documents[key];
          const uploaded = Boolean(file);
          const isUploading = uploading === key;

          return (
            <View key={key} style={styles.section}>
              <ThemedText type="defaultSemiBold">{label}</ThemedText>
              <Pressable
                disabled={uploaded || isUploading}
                onPress={() => pickImage(key)}
                style={[
                  styles.uploadCard,
                  uploaded && {
                    borderColor: primary,
                    borderStyle: "solid",
                    opacity: 0.9,
                  },
                ]}
              >
                <IconSymbol
                  size={32}
                  name={uploaded ? "checkmark.circle.fill" : "cloud.upload"}
                  color={uploaded ? "#22C55E" : "#9CA3AF"}
                />
                <ThemedText style={styles.uploadText}>
                  {isUploading
                    ? "Uploading..."
                    : uploaded
                      ? "File uploaded successfully"
                      : "Tap to upload image"}
                </ThemedText>
                <ThemedText style={styles.hintText}>
                  {uploaded && file
                    ? file.split("/").pop() || "Document"
                    : "JPG, PNG (max 5MB)"}
                </ThemedText>
                {uploaded && (
                  <Pressable
                    onPress={() => removeFile(key)}
                    style={styles.removeButton}
                  >
                    <ThemedText type="link">Remove</ThemedText>
                  </Pressable>
                )}
              </Pressable>
            </View>
          );
        })}
      </Field>
    </ScrollView>
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
  uploadCard: {
    height: 150,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  uploadText: { fontSize: 15, textAlign: "center" },
  hintText: { fontSize: 12, textAlign: "center", color: "#9CA3AF" },
  removeButton: { marginTop: 6 },
});
