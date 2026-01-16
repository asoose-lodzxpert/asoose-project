import React, { useState, useEffect, useRef } from "react";
import {
  fetchVendorProfile,
  fetchStorePublicDetails,
  fetchStoreBalance,
  updateVendorProfileImage,
} from "@/services/profile.service";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Text,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { RelativePathString, useRouter } from "expo-router";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedView } from "@/components/themed-view";
import { ProfileData, VendorStatus } from "@/types/profile";
import { useAuth } from "@/context/AuthContext";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

type AllowedRoute =
  | "/(profile)/edit-business"
  | "/(profile)/resetpassword"
  | "/(profile)/notifications"
  | "/(profile)/support"
  | "/(profile)/terms"
  | "/(profile)/privacy"
  | "/(profile)/delete-account";

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
  { label: "Delete account", route: "/(profile)/delete-account" },
];

const INITIAL_PROFILE: ProfileData & { balance: number } = {
  profilePicture: "",
  businessName: "",
  shopName: "",
  status: "pending",
  balance: 0,
};

export default function ProfileScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const borderColor = useThemeColor({}, "borderDefault");
  const mutedText = useThemeColor({}, "textDisabled");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const statusPending = useThemeColor({}, "statusPending");
  const statusSuccess = useThemeColor({}, "statusSuccess");
  const statusError = useThemeColor({}, "statusError");
  const { signOut } = useAuth();

  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageConfirm, setShowImageConfirm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const balanceInterval = useRef<number | null>(null);

  // Fetch profile and store info
  const loadProfile = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [vendor, store, balance] = await Promise.all([
        fetchVendorProfile(),
        fetchStorePublicDetails(),
        fetchStoreBalance(),
      ]);
      setProfile({
        profilePicture: vendor.image || "",
        businessName: vendor.name || "",
        shopName: store?.name || "",
        status: vendor.status || "pending",
        balance: balance?.amount ?? 0,
      });
    } catch (e) {
      // Optionally show error toast
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      loadProfile();
    }

    // Set up periodic balance refresh
    balanceInterval.current = setInterval(async () => {
      try {
        const balance = await fetchStoreBalance();
        setProfile((prev) => ({ ...prev, balance: balance?.amount ?? 0 }));
      } catch {}
    }, 180000); // 3 minutes

    return () => {
      mounted = false;
      if (balanceInterval.current) {
        clearInterval(balanceInterval.current);
      }
    };
  }, []);

  /** Handle pull to refresh */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile(true);
  };

  /** Pick profile image */
  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Toast.show({
        type: "error",
        text1: "Permission required to access photos",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
      setShowImageConfirm(true);
    }
  };

  /** Confirm and upload image */
  const handleConfirmImageChange = async () => {
    if (!selectedImage) return;

    setUploadingImage(true);
    setShowImageConfirm(false);

    try {
      await updateVendorProfileImage(selectedImage);

      Toast.show({
        type: "success",
        text1: "Profile image updated successfully",
      });

      // Refresh profile to get updated image URL
      await loadProfile(true);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error.message || "Failed to update profile image",
      });
    } finally {
      setUploadingImage(false);
      setSelectedImage(null);
    }
  };

  /** Cancel image change */
  const handleCancelImageChange = () => {
    setShowImageConfirm(false);
    setSelectedImage(null);
  };

  /** Get badge color */
  const getStatusColor = (status: VendorStatus) => {
    switch (status) {
      case "pending":
        return statusPending;
      case "approved":
        return statusSuccess;
      case "suspended":
        return statusError;
    }
  };

  if (loading) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14, gap: 16 }}
        >
          {/* Profile Card Skeleton */}
          <View style={[styles.card, { backgroundColor: surfaceCard }]}>
            <View style={styles.profileRow}>
              <View style={styles.profileInfo}>
                <View
                  style={[
                    styles.skeleton,
                    { width: "80%", height: 20, backgroundColor: borderColor },
                  ]}
                />
                <View
                  style={[
                    styles.skeleton,
                    {
                      width: "60%",
                      height: 16,
                      marginTop: 8,
                      backgroundColor: borderColor,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.skeleton,
                    {
                      width: 120,
                      height: 28,
                      marginTop: 8,
                      borderRadius: 12,
                      backgroundColor: borderColor,
                    },
                  ]}
                />
              </View>

              {/* Right: Avatar Skeleton */}
              <View
                style={[
                  styles.skeleton,
                  {
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    backgroundColor: borderColor,
                  },
                ]}
              />
            </View>

            {/* Balance Card Skeleton */}
            <View
              style={[
                styles.balanceCard,
                { backgroundColor: surfaceCard, marginTop: 12 },
              ]}
            >
              <View style={{ gap: 4 }}>
                <View
                  style={[
                    styles.skeleton,
                    { width: 60, height: 16, backgroundColor: borderColor },
                  ]}
                />
                <View
                  style={[
                    styles.skeleton,
                    { width: 100, height: 18, backgroundColor: borderColor },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.skeleton,
                  {
                    width: 90,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: borderColor,
                  },
                ]}
              />
            </View>
          </View>

          {/* Account Settings Title Skeleton */}
          <View
            style={[
              styles.skeleton,
              { width: 150, height: 20, backgroundColor: borderColor },
            ]}
          />

          {/* Settings Card Skeleton */}
          <View style={[styles.card, { backgroundColor: surfaceCard }]}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <View
                key={item}
                style={[
                  styles.settingRow,
                  { borderColor: borderColor },
                  item === 6 && { borderBottomWidth: 0 },
                ]}
              >
                <View
                  style={[
                    styles.skeleton,
                    { width: "60%", height: 16, backgroundColor: borderColor },
                  ]}
                />
                <View
                  style={[
                    styles.skeleton,
                    {
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: borderColor,
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          {/* Logout Button Skeleton */}
          <View
            style={[
              styles.skeleton,
              {
                height: 48,
                borderRadius: 12,
                backgroundColor: borderColor,
              },
            ]}
          />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={primary}
          />
        }
      >
        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
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
              {uploadingImage ? (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              ) : (
                <Pressable style={styles.editOverlay} onPress={pickImage}>
                  <IconSymbol name="camera.fill" size={20} color="#fff" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Balance + Withdraw */}
          {profile.balance !== undefined && (
            <View
              style={[styles.balanceCard, { backgroundColor: surfaceCard }]}
            >
              <View>
                <ThemedText type="defaultSemiBold">Balance</ThemedText>
                <ThemedText style={{ color: mutedText, fontSize: 14 }}>
                  ₦{profile.balance.toLocaleString()}
                </ThemedText>
              </View>
              <Pressable
                style={styles.withdrawButton}
                onPress={() =>
                  router.push("/(profile)/withdrawal" as RelativePathString)
                }
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
        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
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
          style={[styles.logoutButton, { borderColor: statusError }]}
          onPress={() => signOut()}
        >
          <ThemedText style={{ color: statusError }}>Logout</ThemedText>
        </Pressable>

        <Text style={styles.copyright}>
          {profile.businessName} © Asoose Lodzexprt Nig Ltd
        </Text>
      </ScrollView>

      {/* Image Change Confirmation Modal */}
      <ConfirmationModal
        visible={showImageConfirm}
        message="Do you want to change your profile image?"
        onConfirm={handleConfirmImageChange}
        onCancel={handleCancelImageChange}
        loading={uploadingImage}
      />

      <Toast />
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
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
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
  skeleton: {
    borderRadius: 6,
    opacity: 0.3,
  },
});
