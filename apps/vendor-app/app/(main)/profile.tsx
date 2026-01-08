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
import { RelativePathString, useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedView } from "@/components/themed-view";
import { ProfileData, VendorStatus } from "@/types/profile";
import { useAuth } from "@/context/AuthContext";

type AllowedRoute =
  | "/(profile)/edit-business"
  | "/(profile)/resetpassword"
  | "/(profile)/notifications"
  | "/(profile)/support"
  | "/(profile)/terms"
  | "/(profile)/privacy";

interface SettingItem {
  label: string;
  route: AllowedRoute;
}

const SETTINGS: SettingItem[] = [
  { label: "Edit business profile", route: "/(profile)/edit-business" },
  { label: "Change password", route: "/(profile)/resetpassword" },
  { label: "Notification preferences", route: "/(profile)/notifications" },
  { label: "Support and help", route: "/(profile)/support" },
  { label: "Terms of service", route: "/(profile)/terms" },
  { label: "Privacy policy", route: "/(profile)/privacy" },
];

const DUMMY_PROFILE: ProfileData & { balance: number } = {
  profilePicture: "",
  businessName: "Asoose",
  shopName: "Asoose Shop",
  status: "approved",
  balance: 2574256,
};

export default function ProfileScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const borderColor = useThemeColor({}, "borderDefault");
  const mutedText = useThemeColor({}, "textDisabled");
  const { signOut } = useAuth();

  const [profile, setProfile] = useState(DUMMY_PROFILE);

  /** Pick profile image */
  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted)
      return alert("Permission required to access photos");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProfile((prev) => ({ ...prev, profilePicture: result.assets[0].uri }));
    }
  };

  /** Get badge color */
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
        contentContainerStyle={{ padding: 24, gap: 16 }}
      >
        {/* Profile Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: useThemeColor({}, "surfaceCard") },
          ]}
        >
          <View style={styles.profileRow}>
            {/* Left: Info */}
            <View style={styles.profileInfo}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
                {profile.businessName}
              </ThemedText>
              <ThemedText style={{ fontSize: 14, color: mutedText }}>
                {profile.shopName}
              </ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(profile.status) },
                ]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: textOnPrimary, fontSize: 12 }}
                >
                  {profile.status === "approved"
                    ? "Approved Vendor"
                    : profile.status.charAt(0).toUpperCase() +
                      profile.status.slice(1)}
                </ThemedText>
              </View>
            </View>

            {/* Right: Avatar */}
            <View style={{ position: "relative" }}>
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
          </View>

          {/* Balance + Withdraw */}
          {profile.balance !== undefined && (
            <View
              style={[
                styles.balanceCard,
                { backgroundColor: useThemeColor({}, "surfaceCard") },
              ]}
            >
              <View>
                <ThemedText type="defaultSemiBold">Balance</ThemedText>
                <ThemedText style={{ color: mutedText, fontSize: 14 }}>
                  ₦{profile.balance.toLocaleString()}
                </ThemedText>
              </View>
              <Pressable
                style={styles.withdrawButton}
                onPress={() => console.log("Withdraw pressed")}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                  Withdraw
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        {/* Account Settings */}
        <ThemedText type="subtitle">Account Settings</ThemedText>
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
                { borderColor: borderColor },
                idx === SETTINGS.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => router.push(s.route as RelativePathString)}
            >
              <ThemedText>{s.label}</ThemedText>
              <IconSymbol name="chevron.right" size={18} color={primary} />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable
          style={[
            styles.logoutButton,
            { borderColor: useThemeColor({}, "statusError") },
          ]}
          onPress={() => signOut()}
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
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
    alignSelf: "flex-start",
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
  balanceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 12,
  },
  withdrawButton: {
    backgroundColor: "#E5A503",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
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
