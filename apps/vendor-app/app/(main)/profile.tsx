import {
  fetchStoreBalance,
  fetchStorePublicDetails,
  fetchVendorProfile,
  updateVendorProfileImage,
} from "@/services/profile.service";
import * as ImagePicker from "expo-image-picker";
import { RelativePathString, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ProfileData, VendorStatus } from "@/types/profile";

/* -------------------------------------------------------------------------- */

type AllowedRoute =
  | "/(profile)/edit-business"
  | "/(profile)/resetpassword"
  | "/(profile)/notifications"
  | "/(profile)/support"
  | "/(profile)/terms"
  | "/(profile)/privacy"
  | "/(profile)/delete-account";

const SETTINGS = [
  { label: "Edit business profile", route: "/(profile)/edit-business" },
  { label: "Change password", route: "/(profile)/resetpassword" },
  { label: "Notification preferences", route: "/(profile)/notifications" },
  { label: "Support and help", route: "/(profile)/support" },
  { label: "Terms of service", route: "/(profile)/terms" },
  { label: "Privacy policy", route: "/(profile)/privacy" },
  { label: "Delete account", route: "/(profile)/delete-account" },
];

const INITIAL_PROFILE: ProfileData & { balance: number } = {
  storeBanner: "",
  profilePicture: "",
  businessName: "",
  shopName: "",
  status: "PENDING",
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
        storeBanner: store?.banner || "",
        status: vendor.status || "PENDING",
        balance: balance?.amount ?? 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();

    balanceInterval.current = setInterval(async () => {
      const balance = await fetchStoreBalance();
      setProfile((p) => ({ ...p, balance: balance?.amount ?? 0 }));
    }, 180000);

    return () => {
      if (balanceInterval.current) clearInterval(balanceInterval.current);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile(true);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Toast.show({ type: "error", text1: "Permission required" });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setShowImageConfirm(true);
    }
  };

  /* -------------------- BANNER HANDLER (OUTSIDE COMPONENT) -------------------- */
  async function pickAndUploadBanner(onSuccess: () => Promise<void>) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
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
      aspect: [16, 9],
    });

    if (!result.canceled && result.assets.length > 0) {
      try {
        await updateVendorProfileImage(result.assets[0].uri, "banner");
        Toast.show({
          type: "success",
          text1: "Store banner updated successfully",
        });
        await onSuccess();
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: error.message || "Failed to update store banner",
        });
      }
    }
  }

  const handleConfirmImageChange = async () => {
    if (!selectedImage) return;
    setUploadingImage(true);
    setShowImageConfirm(false);

    try {
      await updateVendorProfileImage(selectedImage);
      await loadProfile(true);
      Toast.show({ type: "success", text1: "Profile image updated" });
    } finally {
      setUploadingImage(false);
      setSelectedImage(null);
    }
  };

  const getStatusColor = (status: VendorStatus) => {
    switch (status) {
      case "PENDING":
        return statusPending;
      case "APPROVED":
        return statusSuccess;
      case "SUSPENDED":
        return statusError;
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 14, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* ---------------- PROFILE CARD WITH BANNER BACKGROUND ---------------- */}
        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
          {profile.storeBanner && (
            <Image
              source={{ uri: profile.storeBanner }}
              style={styles.cardBanner}
            />
          )}

          <Pressable
            style={styles.bannerEditOverlay}
            onPress={() => pickAndUploadBanner(() => loadProfile(true))}
          >
            <IconSymbol name="camera.fill" size={20} color="#fff" />
          </Pressable>

          <View style={styles.cardContent}>
            <View style={styles.profileRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="title">{profile.businessName}</ThemedText>
                <ThemedText type="subtitle">{profile.shopName}</ThemedText>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(profile.status) },
                  ]}
                >
                  <ThemedText style={{ color: textOnPrimary, fontSize: 12 }}>
                    {profile.status}
                  </ThemedText>
                </View>
              </View>

              <View>
                <Image
                  source={
                    profile.profilePicture
                      ? { uri: profile.profilePicture }
                      : require("@/assets/default-avatar.png")
                  }
                  style={styles.avatar}
                />
                <Pressable style={styles.editOverlay} onPress={pickImage}>
                  <IconSymbol name="camera.fill" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={styles.balanceCard}>
              <View>
                <ThemedText type="defaultSemiBold">Balance</ThemedText>
                <ThemedText style={{ color: mutedText }}>
                  ₦{profile.balance.toLocaleString()}
                </ThemedText>
              </View>
              <Pressable
                style={styles.withdrawButton}
                onPress={() =>
                  router.push("/(profile)/withdrawal" as RelativePathString)
                }
              >
                <ThemedText style={{ color: "#fff" }}>Withdraw</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ---------------- SETTINGS ---------------- */}
        <ThemedText type="subtitle">Account Settings</ThemedText>
        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
          {SETTINGS.map((s, i) => (
            <Pressable
              key={s.label}
              style={[
                styles.settingRow,
                i === SETTINGS.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => router.push(s.route as RelativePathString)}
            >
              <ThemedText>{s.label}</ThemedText>
              <IconSymbol name="chevron.right" size={18} color={primary} />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.logoutButton, { borderColor: statusError }]}
          onPress={signOut}
        >
          <ThemedText style={{ color: statusError }}>Logout</ThemedText>
        </Pressable>

        <Text style={styles.copyright}>
          {profile.businessName} © Asoose Lodzexprt Nig Ltd
        </Text>
      </ScrollView>

      <ConfirmationModal
        visible={showImageConfirm}
        message="Change profile image?"
        onConfirm={handleConfirmImageChange}
        onCancel={() => setShowImageConfirm(false)}
        loading={uploadingImage}
      />
    </ThemedView>
  );
}

/* -------------------------------- STYLES -------------------------------- */

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
  },
  cardBanner: {
    ...StyleSheet.absoluteFillObject,
    height: 140,
  },
  cardContent: {
    padding: 16,
    paddingTop: 100,
    gap: 12,
  },
  bannerEditOverlay: {
    position: "absolute",
    right: 12,
    top: 12,
    backgroundColor: "#0008",
    borderRadius: 16,
    padding: 6,
    zIndex: 2,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    borderRadius: 14,
  },
  balanceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  withdrawButton: {
    backgroundColor: "#E5A503",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  settingRow: {
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
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
    color: "#9CA3AF",
    marginTop: 16,
  },
});
