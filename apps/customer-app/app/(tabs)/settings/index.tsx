import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";

export default function SettingsScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "textMuted");
  const card = useThemeColor({}, "surfaceCard");
    const border = useThemeColor({}, "borderDefault");
    const accentRed = useThemeColor({}, "statusError");
    const accentBlue = useThemeColor({}, "brandPrimary");
    const accentGreen = useThemeColor({}, "statusSuccess");
    const textOnPrimary = useThemeColor({}, "textOnPrimary");

    const { user, logout } = useAuth();
  const router = useRouter();
  const showConfirm = useConfirm();

  const profileCompletion = 0.75;
  const profileCompletionLabel = `Profile Complete: ${Math.round(
    profileCompletion * 100
  )}%`;

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
      >
        {/* Profile */}
        <Pressable
          style={[styles.heroCard, { backgroundColor: primary }]}
          onPress={() => router.push("/profile" as any)}
        >
          <View style={styles.heroContent}>
            <View
              style={[
                styles.avatarWrap,
                { borderColor: textOnPrimary, backgroundColor: textOnPrimary },
              ]}
            >
              <Image
                source={
                  user?.avatarUrl
                    ? { uri: user.avatarUrl }
                    : require("@/assets/default-avatar.png")
                }
                style={styles.avatar}
              />
            </View>

            <ThemedText
              type="title"
              style={[styles.heroName, { color: textOnPrimary }]}
            >
              {user ? `Hey, ${user.name}!` : "Hey there!"}
            </ThemedText>

            {user?.phone && (
              <ThemedText type="caption">{user.phone}</ThemedText>
            )}

            <View style={styles.profileProgressRow}>
              <ThemedText
                type="caption"
                style={[styles.profileProgressLabel, { color: textOnPrimary }]}
              >
                {profileCompletionLabel}
              </ThemedText>

              <View
                style={[
                  styles.profileProgressBarWrap,
                  { backgroundColor: textOnPrimary + "44" },
                ]}
              >
                <View
                  style={[
                    styles.profileProgressBar,
                    {
                      width: `${profileCompletion * 100}%`,
                      backgroundColor: textOnPrimary,
                    },
                  ]}
                />
              </View>

              <IconSymbol
                name="chevron.right"
                size={18}
                color={textOnPrimary}
              />
            </View>
          </View>
        </Pressable>

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
            onPress={() => router.push("/payment-methods" as any)}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentRed + "22" }]}
            >
              <IconSymbol name="credit-card" size={18} color={primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Payment Methods</ThemedText>
              <ThemedText type="caption">Cards, Paystack, Wallet</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>

          <Pressable
            style={styles.rowLast}
            onPress={() => router.push("/(settings)/addresses")}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentBlue + "22" }]}
            >
              <IconSymbol name="location" size={18} color={primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Addresses</ThemedText>
              <ThemedText type="caption">Home, Work, Others</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>
        </ThemedView>

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
            onPress={() => router.push("/orders" as any)}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentGreen + "22" }]}
            >
              <IconSymbol name="shopping-bag" size={18} color={primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Orders</ThemedText>
              <ThemedText type="caption">All purchases</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>

          <Pressable
            style={[styles.row, { borderBottomColor: border }]}
            onPress={() => router.push("/rides" as any)}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentGreen + "22" }]}
            >
              <IconSymbol name="car" size={18} color={primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Rides</ThemedText>
              <ThemedText type="caption">Trip history</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>

          <Pressable
            style={styles.rowLast}
            onPress={() => router.push("/(delivery)/history")}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentGreen + "22" }]}
            >
              <IconSymbol name="truck" size={18} color={primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>Deliveries</ThemedText>
              <ThemedText type="caption">Package history</ThemedText>
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
            Account Settings
          </ThemedText>

          <Pressable
            style={[styles.row, { borderBottomColor: border }]}
            onPress={() => router.push("/(settings)/notifications")}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentBlue + "22" }]}
            >
              <IconSymbol name="bell" size={18} color={primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={styles.rowLabel}>
                Notification Preferences
              </ThemedText>
              <ThemedText type="caption">Push, email and SMS</ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={18} color={muted} />
          </Pressable>

          <Pressable
            style={[styles.row, { borderBottomColor: border }]}
            onPress={() => router.push("/(settings)/emergency-contact")}
          >
            <View
              style={[styles.iconBox, { backgroundColor: accentGreen + "22" }]}
            >
              <IconSymbol name="phone" size={18} color={primary} />
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
              style={[styles.iconBox, { backgroundColor: accentRed + "22" }]}
            >
              <IconSymbol name="delete" size={18} color={accentRed} />
            </View>
            <View style={styles.rowTextWrap}>
              <ThemedText style={[styles.rowLabel, { color: accentRed }]}>
                Delete Account
              </ThemedText>
              <ThemedText type="caption">
                Permanently remove your account
              </ThemedText>
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
  scrollContent: { paddingBottom: 32 },

  heroCard: {
    marginTop: Platform.OS === "ios" ? 24 : 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  heroContent: {
    padding: 16,
    alignItems: "center",
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  heroName: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },

  profileProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  profileProgressLabel: {
    marginRight: 8,
    fontWeight: "600",
  },
  profileProgressBarWrap: {
    height: 6,
    width: 72,
    borderRadius: 3,
    overflow: "hidden",
    marginRight: 6,
  },
  profileProgressBar: {
    height: 6,
    borderRadius: 3,
  },

  sectionGroup: {
    marginTop: 24,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionTitle: {
    marginLeft: 16,
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
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
    marginLeft: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  logoutButton: {
    marginTop: 32,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
