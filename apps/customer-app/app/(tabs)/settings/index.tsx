import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Platform,
  RefreshControl,
  Switch,
} from "react-native";
import Toast from "react-native-toast-message";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { get } from "@/lib/authFetch";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  phone?: string | null;
  createdAt?: string;
  role?: string;
};

export default function SettingsScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const accentRed = useThemeColor({}, "statusError");
  const accentBlue = useThemeColor({}, "brandPrimary");
  const accentGreen = useThemeColor({}, "statusSuccess");
  const textPrimary = useThemeColor({}, "textPrimary");

  const { 
    user, 
    logout, 
    biometricAvailable, 
    isBiometricEnabled, 
    disableBiometrics
  } = useAuth();
  const router = useRouter();
  const showConfirm = useConfirm();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const loadProfile = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const { silent = false } = options;
      if (!silent) setProfileLoading(true);
      try {
        const data = (await get("users/profile")) as UserProfile;
        setProfile(data);
        setProfileError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load profile";
        setProfileError(message);
      } finally {
        if (!silent) setProfileLoading(false);
      }
    },
    [get],
  );

  useEffect(() => {
    loadProfile();
    isBiometricEnabled().then(setBiometricEnabled);
  }, [loadProfile, isBiometricEnabled]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile({ silent: true });
    setRefreshing(false);
  }, [loadProfile]);

  const displayName = profile?.name ?? user?.name ?? "User";
  const displaySubtitle = profile?.email ?? profile?.phone ?? user?.email ?? "";
  const displayAvatar = profile?.avatarUrl ?? user?.avatarUrl;

  const handleLogout = async () => {
    const ok = await showConfirm({
      title: "Sign out",
      message: "Are you sure you want to sign out?",
      icon: "alert-circle",
      variant: "danger",
      confirmLabel: "Sign out",
    });

    if (!ok) return;

    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={primary}
            colors={[primary]}
          />
        }
      >
        {/* --- REDESIGNED PROFILE CARD --- */}
        <View style={styles.headerContainer}>
          <ThemedText type="title" style={{ fontSize: 32, marginBottom: 16 }}>
            Settings
          </ThemedText>
        </View>

        <Pressable
          style={[
            styles.profileCard,
            { backgroundColor: card, borderColor: border },
          ]}
          onPress={() => router.push("/(settings)/profile")}
        >
          <View style={styles.profileRow}>
            {/* Avatar */}
            <View style={[styles.avatarContainer, { borderColor: border }]}>
              <Image
                source={
                  displayAvatar
                    ? { uri: displayAvatar }
                    : require("@/assets/default-avatar.png")
                }
                style={styles.avatarImage}
              />
            </View>

            {/* Info */}
            <View style={styles.profileInfo}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <ThemedText style={styles.profileName} numberOfLines={1}>
                  {displayName}
                </ThemedText>
                {profileLoading && (
                  <ActivityIndicator size="small" color={primary} />
                )}
              </View>

              {profileError ? (
                <ThemedText style={{ color: accentRed, fontSize: 13 }}>
                  {profileError}
                </ThemedText>
              ) : (
                <ThemedText
                  style={{ color: muted, fontSize: 14 }}
                  numberOfLines={1}
                >
                  {displaySubtitle}
                </ThemedText>
              )}

              <View style={styles.editBadge}>
                <ThemedText
                  style={{ color: primary, fontSize: 12, fontWeight: "600" }}
                >
                  Edit Profile
                </ThemedText>
              </View>
            </View>

            {/* Arrow */}
            <IconSymbol name="chevron.right" size={20} color={muted} />
          </View>
        </Pressable>
        {/* ------------------------------- */}

        {/* Your Account */}
        <ThemedView
          style={[
            styles.sectionGroup,
            { backgroundColor: card, borderColor: border },
          ]}
        >
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Your Account
          </ThemedText>

          <Pressable
            style={[styles.row, { borderBottomColor: border }]}
            onPress={() => router.push("/(settings)/addresses")}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentBlue + "15" }]}
            >
              <IconSymbol name="location" size={18} color={accentBlue} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Addresses</ThemedText>
              <ThemedText type="caption">Home, Work, Others</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>

          <Pressable
            style={styles.rowLast}
            onPress={() => router.push("/(settings)/linked-accounts")}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentGreen + "15" }]}
            >
              <IconSymbol name="link" size={18} color={accentGreen} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Linked Accounts</ThemedText>
              <ThemedText type="caption">Google, Apple Sign-In</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>
        </ThemedView>

        {/* Activity & History */}
        <ThemedView
          style={[
            styles.sectionGroup,
            { backgroundColor: card, borderColor: border },
          ]}
        >
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Activity & History
          </ThemedText>

          <Pressable
            style={[styles.row, { borderBottomColor: border }]}
            onPress={() => router.push("/(settings)/order-history-screen")}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentGreen + "15" }]}
            >
              <IconSymbol name="shopping-bag" size={18} color={accentGreen} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Orders</ThemedText>
              <ThemedText type="caption">All purchases</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>

          <Pressable
            style={[styles.row, { borderBottomColor: border }]}
            onPress={() => router.push("/(settings)/rides")}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentGreen + "15" }]}
            >
              <IconSymbol name="car" size={18} color={accentGreen} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Rides</ThemedText>
              <ThemedText type="caption">Trip history</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>

          <Pressable
            style={[styles.row, { borderBottomColor: border }]}
            onPress={() => router.push("/(settings)/scheduled-rides")}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentBlue + "15" }]}
            >
              <IconSymbol name="clock.fill" size={18} color={accentBlue} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Scheduled Rides</ThemedText>
              <ThemedText type="caption">Manage upcoming journeys</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>

          <Pressable
            style={[styles.row, { borderBottomColor: border }]}
            onPress={() => router.push("/(delivery)/history")}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentGreen + "15" }]}
            >
              <IconSymbol name="truck" size={18} color={accentGreen} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Deliveries</ThemedText>
              <ThemedText type="caption">Package history</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>

          <Pressable
            style={styles.rowLast}
            onPress={() => router.push("/(settings)/disputes" as any)}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentRed + "15" }]}
            >
              <IconSymbol
                name="exclamationmark.circle.fill"
                size={18}
                color={accentRed}
              />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Disputes</ThemedText>
              <ThemedText type="caption">Your filed disputes</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>
        </ThemedView>

        {/* Account Settings */}
        <ThemedView
          style={[
            styles.sectionGroup,
            { backgroundColor: card, borderColor: border },
          ]}
        >
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Preferences
          </ThemedText>

          {biometricAvailable && (
            <Pressable
              style={[styles.row, { borderBottomColor: border }]}
              onPress={async () => {
                try {
                  const enabled = await isBiometricEnabled();
                  if (enabled) {
                    await disableBiometrics();
                    setBiometricEnabled(false);
                  } else {
                    // This will prompt for fingerprint and save creds
                    // We need user to re-enter password for the actual encryption usually, 
                    // but for now enableBiometrics(email, pass) handles confirmation.
                    // If we don't have pass, we can't save. 
                    // The user said: "ask him to put the fingerprint before enabling it"
                    router.push("/(settings)/profile"); // Fallback if we need to explain they should set up from login or profile
                    // Actually, let's just add the toggle here for visibility.
                  }
                } catch (err: any) {
                   // error
                }
              }}
            >
              <View style={[styles.iconBox, { backgroundColor: primary + "15" }]}>
                <IconSymbol name="fingerprint" size={18} color={primary} />
              </View>
              <View style={styles.rowTextWrap}>
                <ThemedText style={styles.rowLabel}>Fingerprint Login</ThemedText>
                <ThemedText type="caption">
                  {biometricEnabled ? "Enabled" : "Disabled"}
                </ThemedText>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={async (value) => {
                  if (!value) {
                    await disableBiometrics();
                    setBiometricEnabled(false);
                  } else {
                    // Redirect to login or show dialog to confirm with password first?
                    // The user wants it to prompt fingerprint. 
                    // AuthContext.enableBiometrics already prompts fingerprint.
                    // But it needs email/password to save.
                    // Since we are in Settings, we don't HAVE the password.
                    Toast.show({ 
                      type: 'info', 
                      text1: 'Security', 
                      text2: 'Please sign out and enable Biometrics during next login for security.' 
                    });
                  }
                }}
                trackColor={{ false: border, true: primary + "60" }}
                thumbColor={biometricEnabled ? primary : "#f4f3f4"}
              />
            </Pressable>
          )}

          <Pressable
            style={[styles.row, { borderBottomColor: border }]}
            onPress={() => router.push("/(settings)/notifications")}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentBlue + "15" }]}
            >
              <IconSymbol name="bell" size={18} color={accentBlue} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Notifications</ThemedText>
              <ThemedText type="caption">Push, email and SMS</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>

          <Pressable
            style={[styles.row, { borderBottomColor: border }]}
            onPress={() => router.push("/(settings)/emergency-contact")}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentRed + "15" }]}
            >
              <IconSymbol name="phone" size={18} color={accentRed} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Emergency Contact</ThemedText>
              <ThemedText type="caption">Trusted person details</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>

          <Pressable
            style={styles.rowLast}
            onPress={() => router.push("/(settings)/delete-account")}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentRed + "15" }]}
            >
              <IconSymbol name="trash" size={18} color={accentRed} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={[styles.rowLabel, { color: accentRed }]}>
                Delete Account
              </ThemedText>
              <ThemedText type="caption">Permanently remove account</ThemedText>
            </View>
          </Pressable>
        </ThemedView>

        {/* Logout */}
        <Pressable
          style={[styles.logoutButton, { borderColor: border }]}
          onPress={handleLogout}
        >
          <IconSymbol
            name="log-out"
            size={18}
            color={accentRed}
            style={{ marginRight: 8 }}
          />
          <ThemedText style={[styles.logoutText, { color: accentRed }]}>
            Logout
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 10 },

  // --- New Profile Card Styles ---
  profileCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  editBadge: {
    marginTop: 4,
    alignSelf: "flex-start",
  },
  // -------------------------------

  sectionGroup: {
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionTitle: {
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    opacity: 0.6,
    letterSpacing: 0.5,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  rowLast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowTextWrap: {
    flex: 1,
    marginLeft: 14,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  logoutButton: {
    marginTop: 32,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
