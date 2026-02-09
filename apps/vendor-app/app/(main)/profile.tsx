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
  const balanceInterval = useRef<NodeJS.Timeout | null>(null);

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
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* ---------------- PROFILE CARD WITH BANNER ---------------- */}
        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
          {/* Banner Section */}
          <View style={styles.bannerContainer}>
            {profile.storeBanner ? (
              <Image
                source={{ uri: profile.storeBanner }}
                style={styles.cardBanner}
              />
            ) : (
              <View style={[styles.cardBanner, { backgroundColor: primary }]} />
            )}

            <Pressable
              style={styles.bannerEditOverlay}
              onPress={() => pickAndUploadBanner(() => loadProfile(true))}
            >
              <IconSymbol name="camera.fill" size={20} color="#fff" />
            </Pressable>

            {/* Avatar positioned at bottom of banner */}
            <View style={styles.avatarContainer}>
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

          {/* Profile Info Below Banner */}
          <View style={styles.cardContent}>
            <View style={styles.profileInfo}>
              <ThemedText type="title" style={styles.businessName}>
                {profile.businessName}
              </ThemedText>
              <ThemedText type="subtitle" style={styles.shopName}>
                {profile.shopName}
              </ThemedText>

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

            {/* Balance Section */}
            <View
              style={[
                styles.balanceCard,
                { backgroundColor: surfaceCard, borderColor },
              ]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText style={{ color: mutedText, fontSize: 13 }}>
                  Available Balance
                </ThemedText>
                <ThemedText type="title" style={{ marginTop: 4 }}>
                  ₦{profile.balance.toLocaleString()}
                </ThemedText>
              </View>
              <Pressable
                style={[styles.withdrawButton, { backgroundColor: primary }]}
                onPress={() =>
                  router.push("/(profile)/withdrawal" as RelativePathString)
                }
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: textOnPrimary }}
                >
                  Withdraw
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ---------------- SETTINGS ---------------- */}
        <View style={styles.sectionContainer}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Account Settings
          </ThemedText>
          <View style={[styles.card, { backgroundColor: surfaceCard }]}>
            {SETTINGS.map((s, i) => (
              <Pressable
                key={s.label}
                style={[
                  styles.settingRow,
                  { borderColor },
                  i === SETTINGS.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => router.push(s.route as RelativePathString)}
              >
                <ThemedText>{s.label}</ThemedText>
                <IconSymbol name="chevron.right" size={18} color={primary} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Pressable
            style={[styles.logoutButton, { borderColor: statusError }]}
            onPress={signOut}
          >
            <IconSymbol name="logout" size={20} color={statusError} />
            <ThemedText
              type="defaultSemiBold"
              style={{ color: statusError, marginLeft: 8 }}
            >
              Logout
            </ThemedText>
          </Pressable>

          <Text style={styles.copyright}>
            {profile.businessName} © Asoose Lodzexprt Nig Ltd
          </Text>
        </View>
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
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 24,
  },
  bannerContainer: {
    position: "relative",
    height: 180,
  },
  cardBanner: {
    width: "100%",
    height: "100%",
  },
  bannerEditOverlay: {
    position: "absolute",
    right: 16,
    top: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    padding: 8,
    zIndex: 2,
  },
  avatarContainer: {
    position: "absolute",
    bottom: -50,
    left: 20,
    zIndex: 3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#fff",
  },
  editOverlay: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#000",
    padding: 6,
    borderRadius: 8,
  },
  cardContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileInfo: {
    marginBottom: 20,
  },
  businessName: {
    fontSize: 22,
    marginBottom: 4,
  },
  shopName: {
    fontSize: 15,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
  },
  balanceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  withdrawButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingRow: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  logoutButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  copyright: {
    textAlign: "center",
    color: "#9CA3AF",
    marginTop: 20,
    fontSize: 12,
  },
});
