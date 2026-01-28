import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
  Animated,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import { CustomDropdown } from "@/components/CustomDropdown";
import { DatePicker } from "@/components/DatePicker";
import { STATE_CITIES, STATES } from "@/config/states";
import Toast from "react-native-toast-message";
import {
  getPersonalInfo,
  updatePersonalInfo,
  uploadProfileImage,
} from "@/services/personal-info.service";
import type { PersonalInfo } from "@/types/personal-info";

// Skeleton loader component
const SkeletonBox = ({
  width,
  height,
  radius = 8,
}: {
  width: number | string;
  height: number;
  radius?: number;
}) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          height,
          backgroundColor: "#E5E7EB",
          borderRadius: radius,
          opacity,
        },
        typeof width === "number" ? { width } : { width: width as any },
      ]}
    />
  );
};

const PersonalInfoSkeleton = () => {
  return (
    <View style={{ padding: 20 }}>
      {/* Profile Image Skeleton */}
      <View style={styles.imageContainer}>
        <SkeletonBox width={120} height={120} radius={60} />
      </View>

      {/* Fields Skeletons */}
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <View key={i} style={styles.field}>
          <SkeletonBox width={100} height={18} />
          <SkeletonBox width="100%" height={48} radius={12} />
        </View>
      ))}
    </View>
  );
};

export default function EditPersonalInfoScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");

  const [data, setData] = useState<PersonalInfo | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedState, setSelectedState] = useState<string | undefined>(
    undefined,
  );

  const fetchPersonalInfo = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedData = await getPersonalInfo();
      setData(fetchedData);
      setSelectedState(fetchedData.state ?? undefined);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load personal info",
        text2: error.message || "Please try again",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonalInfo();
  }, [fetchPersonalInfo]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPersonalInfo();
  }, [fetchPersonalInfo]);

  const onChange = <K extends keyof PersonalInfo>(
    key: K,
    value: PersonalInfo[K],
  ) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && data) {
      try {
        Toast.show({
          type: "info",
          text1: "Uploading image...",
        });

        const imageUrl = await uploadProfileImage(result.assets[0].uri);
        onChange("image", imageUrl);

        Toast.show({
          type: "success",
          text1: "Image uploaded successfully",
        });
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Failed to upload image",
          text2: error.message || "Please try again",
        });
      }
    }
  };

  const handleDone = async () => {
    if (!data) return;

    try {
      await updatePersonalInfo({
        fullName: data.fullName,
        address: data.address,
        phoneCode: data.phoneCode,
        phoneNumber: data.phoneNumber,
        dob: data.dob,
        state: data.state || undefined,
        city: data.city || undefined,
        image: data.image || undefined,
      });

      Toast.show({
        type: "success",
        text1: "Saved",
        text2: "Personal information updated successfully",
      });
      setEditing(false);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: error.message || "Failed to update personal information",
      });
    }
  };

  const cities = useMemo(() => {
    if (!selectedState) return [];
    return STATE_CITIES[selectedState] || [];
  }, [selectedState]);

  return (
    <ThemedView style={{ flex: 1, backgroundColor: surface }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        {/* Header */}
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
            Personal Information
          </ThemedText>
          {!loading &&
            data &&
            (editing ? (
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
            ))}
          {(loading || !data) && <View style={{ width: 40 }} />}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[primary]}
            />
          }
        >
          {loading && !data ? (
            <PersonalInfoSkeleton />
          ) : data ? (
            <View style={{ padding: 20 }}>
              {/* Profile Image */}
              <View style={styles.imageContainer}>
                {data.image ? (
                  <Image
                    source={{ uri: data.image }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={[styles.profileImage, styles.placeholder]}>
                    <IconSymbol name="camera.fill" size={36} color="#9CA3AF" />
                  </View>
                )}
                {editing && (
                  <Pressable style={styles.changeImageBtn} onPress={pickImage}>
                    <ThemedText style={{ color: primary }}>
                      Change Image
                    </ThemedText>
                  </Pressable>
                )}
              </View>

              {/* Full Name */}
              <Field label="Full Name">
                <ThemedInput
                  placeholder="John Smith"
                  value={data.fullName}
                  onChangeText={(v) => onChange("fullName", v)}
                  editable={editing}
                />
              </Field>

              {/* Address */}
              <Field label="Address">
                <ThemedInput
                  placeholder="Street address"
                  value={data.address}
                  onChangeText={(v) => onChange("address", v)}
                  editable={editing}
                />
              </Field>

              {/* Email */}
              <Field label="Email">
                <ThemedInput
                  placeholder="john@example.com"
                  value={data.email.value}
                  editable={false}
                  iconRight={
                    data.email.isVerified ? (
                      <IconSymbol
                        name="checkmark.seal"
                        size={16}
                        color="#16A34A"
                      />
                    ) : (
                      <Pressable style={{ marginLeft: 8 }}>
                        <ThemedText
                          style={{ color: primary, fontWeight: "600" }}
                        >
                          Verify
                        </ThemedText>
                      </Pressable>
                    )
                  }
                />
              </Field>

              {/* Phone */}
              <Field label="Phone">
                <ThemedInput
                  placeholder="Phone number"
                  value={`${data.phoneCode}${data.phone.value}`}
                  editable={false}
                  iconRight={
                    data.phone.isVerified ? (
                      <IconSymbol
                        name="checkmark.seal"
                        size={16}
                        color="#16A34A"
                      />
                    ) : (
                      <Pressable style={{ marginLeft: 8 }}>
                        <ThemedText
                          style={{ color: primary, fontWeight: "600" }}
                        >
                          Verify
                        </ThemedText>
                      </Pressable>
                    )
                  }
                />
              </Field>

              {/* Phone number editable */}
              {editing && (
                <Field label="Phone Number">
                  <View style={styles.row}>
                    <CustomDropdown
                      data={COUNTRY_CODES}
                      value={data.phoneCode}
                      onChange={(v) => onChange("phoneCode", v as string)}
                      placeholder="+234"
                      containerStyle={{ flex: 2 }}
                      disabled={!editing}
                    />
                    <ThemedInput
                      value={data.phoneNumber}
                      onChangeText={(v) => onChange("phoneNumber", v)}
                      containerStyle={{ flex: 4 }}
                      keyboardType="phone-pad"
                      editable={editing}
                    />
                  </View>
                </Field>
              )}

              {/* DOB */}
              <DatePicker
                label="Date of Birth"
                value={data.dob}
                onChange={(d) => onChange("dob", d.toISOString())}
                maximumDate={get18YearsAgo()}
                prompt="You must be at least 18 years old"
                activeTextColor={primary}
                backgroundColor={surface}
                highlightColor={primary}
              />

              {/* State */}
              <CustomDropdown
                data={STATES}
                value={selectedState}
                onChange={(v) => {
                  setSelectedState(v as string);
                  onChange("state", v as string);
                  onChange("city", null);
                }}
                placeholder="Select state"
                label="State"
                containerStyle={{ marginTop: 20 }}
                disabled={!editing}
              />

              {/* City */}
              <CustomDropdown
                data={cities}
                value={data.city}
                onChange={(v) => onChange("city", v as string)}
                placeholder="Select city"
                label="City / Region"
                containerStyle={{ marginTop: 20 }}
                disabled={!editing}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

/* Field wrapper */
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

/* Helpers */
function get18YearsAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
}

/* Styles */
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  imageContainer: { alignItems: "center", marginBottom: 24 },
  profileImage: { width: 120, height: 120, borderRadius: 60 },
  placeholder: {
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  changeImageBtn: { marginTop: 12 },
  field: { marginTop: 20, gap: 6 },
  row: { flexDirection: "row", gap: 12 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});

/* Static Data */
const COUNTRY_CODES = [
  { label: "+234", value: "+234" },
  { label: "+1", value: "+1" },
  { label: "+44", value: "+44" },
];
