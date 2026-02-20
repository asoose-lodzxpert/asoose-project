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

const VEHICLES: {
  key: NonNullable<VehicleType>;
  label: string;
  icon: IconSymbolName;
  hint: string;
}[] = [
  {
    key: "bicycle",
    label: "Bicycle",
    icon: "bicycle",
    hint: "Pedal-powered, no engine",
  },
  {
    key: "motorcycle",
    label: "Motorcycle",
    icon: "motorcycle",
    hint: "Engine-powered 2-wheeler",
  },
  {
    key: "car",
    label: "Car",
    icon: "car",
    hint: "4-wheeled motor vehicle",
  },
  {
    key: "public_transport",
    label: "Public Transport",
    icon: "directions-bus",
    hint: "Bus, minibus or keke",
  },
];

// Nigerian document requirements per vehicle type
const DOCUMENT_RULES: Record<
  NonNullable<VehicleType>,
  {
    key: keyof SignupForm["documents"];
    label: string;
    prompt: string;
  }[]
> = {
  bicycle: [
    {
      key: "idCard",
      label: "Government-Issued ID",
      prompt:
        "Upload a clear photo of your National ID card, Voter's Card, or International Passport.",
    },
  ],
  motorcycle: [
    {
      key: "idCard",
      label: "Government-Issued ID",
      prompt:
        "Upload a clear photo of your National ID card, Voter's Card, or International Passport.",
    },
    {
      key: "driverLicense",
      label: "Driver's Licence (Category A)",
      prompt:
        "Your FRSC-issued licence showing Category A (motorcycle). Must be valid and not expired.",
    },
    {
      key: "vehicleInsurance",
      label: "Third-Party Insurance Certificate",
      prompt:
        "Upload your NAICOM-approved motor insurance certificate. Third-party minimum is legally required in Nigeria.",
    },
    {
      key: "vehicleRegistration",
      label: "Vehicle Licence / Particulars",
      prompt:
        "Vehicle Licence or Road Worthiness Certificate issued by FRSC or your State MVAA.",
    },
  ],
  car: [
    {
      key: "idCard",
      label: "Government-Issued ID",
      prompt:
        "Upload a clear photo of your National ID card, Voter's Card, or International Passport.",
    },
    {
      key: "driverLicense",
      label: "Driver's Licence (Category B / C / E)",
      prompt:
        "Your FRSC-issued licence for Category B, C, or E vehicles. Must be valid and not expired.",
    },
    {
      key: "vehicleInsurance",
      label: "Third-Party Insurance Certificate",
      prompt:
        "Upload your NAICOM-approved motor insurance certificate. Third-party minimum is legally required in Nigeria.",
    },
    {
      key: "vehicleRegistration",
      label: "Vehicle Licence / Particulars",
      prompt:
        "Vehicle Licence or Road Worthiness Certificate issued by FRSC or your State MVAA.",
    },
  ],
  public_transport: [
    {
      key: "idCard",
      label: "Government-Issued ID",
      prompt:
        "Upload a clear photo of your National ID card, Voter's Card, or International Passport.",
    },
  ],
};

const needsVehicleDetails = (type: VehicleType) =>
  type === "motorcycle" || type === "car";

export function StepVehicleInfo({ data, onChange }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const border = useThemeColor({}, "borderDefault");
  const card = useThemeColor({}, "surfaceCard");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textMuted = useThemeColor({}, "textMuted");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");
  const danger = useThemeColor({}, "statusError");

  const [uploading, setUploading] = useState<string | null>(null);

  const availableVehicles = VEHICLES.filter((v) => {
    if (data.role === "DRIVER") return v.key === "car";
    if (data.state === "Borno") return v.key !== "motorcycle";
    return true;
  });

  const requiredDocuments = data.vehicleType
    ? (DOCUMENT_RULES[data.vehicleType] ?? [])
    : [];

  const pickImage = async (key: keyof SignupForm["documents"]) => {
    try {
      setUploading(key);
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload documents.",
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

      onChange("documents", { ...data.documents, [key]: asset.uri });
      setUploading(null);
    } catch {
      Alert.alert("Error", "Failed to pick image. Please try again.");
      setUploading(null);
    }
  };

  const removeFile = (key: keyof SignupForm["documents"]) => {
    onChange("documents", { ...data.documents, [key]: null });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24, gap: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Vehicle Type */}
      <Field
        label="Choose your vehicle type"
        hint="Choose the vehicle you will use for deliveries."
      >
        <View style={styles.grid}>
          {availableVehicles.map((v) => {
            const selected = data.vehicleType === v.key;
            return (
              <Pressable
                key={v.key}
                style={[
                  styles.vehicle,
                  {
                    borderColor: selected ? primary : border,
                    backgroundColor: selected ? primary + "12" : card,
                  },
                ]}
                onPress={() => onChange("vehicleType", v.key)}
              >
                <IconSymbol
                  name={v.icon}
                  size={36}
                  color={selected ? primary : textMuted}
                />
                <ThemedText
                  style={[
                    styles.vehicleLabel,
                    {
                      color: selected ? primary : textPrimary,
                      fontWeight: selected ? "700" : "500",
                    },
                  ]}
                >
                  {v.label}
                </ThemedText>
                <ThemedText style={[styles.vehicleHint, { color: textMuted }]}>
                  {v.hint}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </Field>

      {/* Vehicle details — motorcycle / car only */}
      {needsVehicleDetails(data.vehicleType) && (
        <>
          <Field
            label="Enter vehicle make / brand"
            hint="The manufacturer of your vehicle (e.g. Toyota, Honda, Bajaj)."
          >
            <ThemedInput
              placeholder="e.g. Toyota"
              value={data.make}
              onChangeText={(v) => onChange("make", v)}
            />
          </Field>

          <Field
            label="Enter vehicle model"
            hint="The specific model name (e.g. Corolla, Camry, TVS Apache)."
          >
            <ThemedInput
              placeholder="e.g. Corolla"
              value={data.model}
              onChangeText={(v) => onChange("model", v)}
            />
          </Field>

          <Field
            label="Enter year of manufacture"
            hint="The 4-digit year your vehicle was manufactured (e.g. 2019)."
          >
            <ThemedInput
              placeholder="e.g. 2019"
              value={data.year}
              onChangeText={(v) => onChange("year", v)}
              keyboardType="number-pad"
              maxLength={4}
            />
          </Field>

          <Field
            label="Enter vehicle colour"
            hint="The colour of your vehicle as it appears on the road."
          >
            <ThemedInput
              placeholder="e.g. Black"
              value={data.color}
              onChangeText={(v) => onChange("color", v)}
            />
          </Field>

          <Field
            label="Enter plate number"
            hint="Your vehicle's registration plate exactly as printed (e.g. ABC-123XY)."
          >
            <ThemedInput
              placeholder="e.g. ABC-123XY"
              value={data.plateNumber}
              onChangeText={(v) => onChange("plateNumber", v.toUpperCase())}
              autoCapitalize="characters"
            />
          </Field>
        </>
      )}

      {/* Bicycle — optional identification fields */}
      {data.vehicleType === "bicycle" && (
        <>
          <Field
            label="Enter bicycle brand (optional)"
            hint="Helps identify your bicycle during support queries."
          >
            <ThemedInput
              placeholder="e.g. Trek, Giant, local"
              value={data.make}
              onChangeText={(v) => onChange("make", v)}
            />
          </Field>

          <Field
            label="Enter bicycle colour (optional)"
            hint="The main colour of your bicycle."
          >
            <ThemedInput
              placeholder="e.g. Red"
              value={data.color}
              onChangeText={(v) => onChange("color", v)}
            />
          </Field>
        </>
      )}

      {/* Document Uploads */}
      {requiredDocuments.length > 0 && (
        <Field
          label="Upload your required documents"
          hint="All documents must be legible. Blurry or cropped images will be rejected during verification."
        >
          {requiredDocuments.map(({ key, label, prompt }) => {
            const file = data.documents[key];
            const uploaded = Boolean(file);
            const isUploading = uploading === key;

            return (
              <View key={key} style={styles.docSection}>
                <ThemedText style={[styles.docLabel, { color: textPrimary }]}>
                  {label}
                </ThemedText>
                <ThemedText
                  style={[styles.docPrompt, { color: textSecondary }]}
                >
                  {prompt}
                </ThemedText>

                <Pressable
                  onPress={() => !uploaded && !isUploading && pickImage(key)}
                  style={[
                    styles.uploadCard,
                    {
                      borderColor: uploaded ? success : border,
                      backgroundColor: uploaded ? success + "0D" : card,
                    },
                  ]}
                >
                  <IconSymbol
                    size={30}
                    name={uploaded ? "checkmark.circle.fill" : "cloud.upload"}
                    color={uploaded ? success : textMuted}
                  />
                  <ThemedText
                    style={[
                      styles.uploadText,
                      { color: uploaded ? success : textPrimary },
                    ]}
                  >
                    {isUploading
                      ? "Selecting..."
                      : uploaded
                        ? "Document uploaded"
                        : "Tap to upload image"}
                  </ThemedText>
                  <ThemedText style={[styles.hintText, { color: textMuted }]}>
                    {uploaded && file
                      ? file.split("/").pop() || "Document"
                      : "JPG or PNG · max 5 MB"}
                  </ThemedText>
                  {uploaded && (
                    <Pressable
                      onPress={() => removeFile(key)}
                      style={[
                        styles.removeButton,
                        { borderColor: danger + "50" },
                      ]}
                    >
                      <IconSymbol name="trash" size={12} color={danger} />
                      <ThemedText
                        style={[styles.removeText, { color: danger }]}
                      >
                        Remove
                      </ThemedText>
                    </Pressable>
                  )}
                </Pressable>
              </View>
            );
          })}
        </Field>
      )}
    </ScrollView>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const textMuted = useThemeColor({}, "textMuted");
  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      {hint ? (
        <ThemedText style={[styles.fieldHint, { color: textMuted }]}>
          {hint}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 20, gap: 4 },
  fieldHint: { fontSize: 12, lineHeight: 17, marginBottom: 2 },

  // Vehicle grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  vehicle: {
    width: "48%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 6,
  },
  vehicleLabel: { fontSize: 14, textAlign: "center" },
  vehicleHint: { fontSize: 11, textAlign: "center" },

  // Documents
  docSection: { gap: 4, marginTop: 16 },
  docLabel: { fontSize: 14, fontWeight: "600" },
  docPrompt: { fontSize: 12, lineHeight: 17 },
  uploadCard: {
    marginTop: 6,
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  uploadText: { fontSize: 14, textAlign: "center", fontWeight: "600" },
  hintText: { fontSize: 12, textAlign: "center" },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  removeText: { fontSize: 12, fontWeight: "600" },
});
