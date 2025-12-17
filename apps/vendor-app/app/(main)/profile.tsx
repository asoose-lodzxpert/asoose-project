import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Text,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedView } from "@/components/themed-view";

type AllowedRoute =
  | "/(main)/(profile)/edit"
  | "/(auth)/resetpassword"
  | "/(main)/(profile)/notifications"
  | "/(main)/(profile)/support"
  | "/(main)/(profile)/terms"
  | "/(main)/(profile)/privacy";

interface SettingItem {
  label: string;
  route: AllowedRoute;
}

const SETTINGS: SettingItem[] = [
  { label: "Edit business profile", route: "/(main)/(profile)/edit" },
  { label: "Change password", route: "/(auth)/resetpassword" },
  {
    label: "Notification preferences",
    route: "/(main)/(profile)/notifications",
  },
  { label: "Support and help", route: "/(main)/(profile)/support" },
  { label: "Terms of service", route: "/(main)/(profile)/terms" },
  { label: "Privacy policy", route: "/(main)/(profile)/privacy" },
];

type VendorStatus = "pending" | "approved" | "suspended";

interface ProfileData {
  profilePicture?: string;
  businessName: string;
  shopName: string;
  status: VendorStatus;
}

const DUMMY_PROFILE: ProfileData = {
  profilePicture: "",
  businessName: "Asoose",
  shopName: "Asoose Shop",
  status: "approved",
};

export default function ProfileScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");

  const [profile, setProfile] = useState<ProfileData>(DUMMY_PROFILE);

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted)
      return alert("Permission required to access photos");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProfile((prev) => ({ ...prev, profilePicture: result.assets[0].uri }));
    }
  };

  const getStatusColor = (status: VendorStatus) => {
    switch (status) {
      case "pending":
        return useThemeColor({}, "statusPending");
      case "approved":
        return useThemeColor({}, "statusSuccess");
      case "suspended":
        return useThemeColor({}, "statusError");
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, gap: 24 }}
      >
        {/* Profile Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: useThemeColor({}, "surfaceCard") },
          ]}
        >
          <View style={{ position: "relative", alignSelf: "center" }}>
            <Image
              source={
                profile.profilePicture
                  ? { uri: profile.profilePicture }
                  : require("@/assets/default-avatar.png")
              }
              style={styles.avatar}
            />
            <Pressable style={styles.editOverlay} onPress={pickImage}>
              <IconSymbol name="camera.fill" size={20} color="#fff" />
            </Pressable>
          </View>

          <ThemedText type="defaultSemiBold" style={styles.centerText}>
            {profile.businessName}
          </ThemedText>
          <ThemedText style={styles.centerText}>{profile.shopName}</ThemedText>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(profile.status) },
            ]}
          >
            <ThemedText type="defaultSemiBold" style={{ color: textOnPrimary }}>
              {profile.status === "approved"
                ? "Approved Vendor"
                : profile.status.charAt(0).toUpperCase() +
                  profile.status.slice(1)}
            </ThemedText>
          </View>
        </View>

        {/* Account Settings Title */}
        <ThemedText type="subtitle">Account Settings</ThemedText>

        {/* Account Settings Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: useThemeColor({}, "surfaceCard") },
          ]}
        >
          {SETTINGS.map((s, idx) => (
            <Pressable
              key={s.label}
              style={[
                styles.settingRow,
                idx === SETTINGS.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => router.push(s.route)}
            >
              <ThemedText>{s.label}</ThemedText>
              <IconSymbol name="chevron.right" size={18} color={primary} />
            </Pressable>
          ))}
        </View>

        {/* Logout Button */}
        <Pressable
          style={[
            styles.logoutButton,
            { borderColor: useThemeColor({}, "statusError") },
          ]}
        >
          <ThemedText style={{ color: useThemeColor({}, "statusError") }}>
            Logout
          </ThemedText>
        </Pressable>

        <Text style={styles.copyright}>
          {profile.businessName} © Asoose Lodzexprt Nig Ltd
        </Text>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  editOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#000",
    padding: 6,
    borderRadius: 16,
  },
  centerText: {
    textAlign: "center",
  },
  statusBadge: {
    alignSelf: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  copyright: {
    textAlign: "center",
    marginTop: 16,
    color: "#9CA3AF",
  },
});
