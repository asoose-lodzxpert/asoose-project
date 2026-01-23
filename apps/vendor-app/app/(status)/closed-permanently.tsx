import React from "react";
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Linking,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function ClosedPermanentlyScreen() {
  const { user, signOut } = useAuth();
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const textSecondary = useThemeColor({}, "textSecondary");
  const statusError = useThemeColor({}, "statusError");

  const handleContactSupport = () => {
    Linking.openURL("mailto:compliance@asoose.com");
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <View
          style={[styles.statusBadge, { backgroundColor: statusError + "20" }]}
        >
          <IconSymbol
            name="lock.fill"
            size={20}
            color={statusError}
            style={styles.badgeIcon}
          />
          <ThemedText style={[styles.statusText, { color: statusError }]}>
            Store Closed Permanently
          </ThemedText>
        </View>

        <View
          style={[
            styles.iconContainer,
            { backgroundColor: statusError + "15" },
          ]}
        >
          <IconSymbol name="shield" size={56} color={statusError} />
        </View>

        <ThemedText type="title" style={styles.title}>
          Hi {user?.name}, your store access has ended
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
          This account can no longer sell on Asoose. You still have access to
          export finance data and download reports.
        </ThemedText>

        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Why stores get closed
          </ThemedText>

          {reasons.map((reason) => (
            <View key={reason} style={styles.reasonItem}>
              <IconSymbol
                name="circle.fill"
                size={8}
                color={statusError}
                style={styles.bulletIcon}
              />
              <ThemedText style={[styles.reasonText, { color: textSecondary }]}>
                {reason}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Need statements or payouts?
          </ThemedText>
          <ThemedText style={[styles.cardText, { color: textSecondary }]}>
            Download sales summaries, tax invoices, and payout receipts anytime
            before exporting your data. For payout disputes, reach our
            compliance desk.
          </ThemedText>

          <Pressable
            style={({ pressed }) => [
              styles.contactButton,
              { borderColor: statusError },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleContactSupport}
          >
            <ThemedText
              style={[styles.contactButtonText, { color: statusError }]}
            >
              Contact Compliance
            </ThemedText>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            { backgroundColor: statusError },
            pressed && styles.buttonPressed,
          ]}
          onPress={signOut}
        >
          <ThemedText style={[styles.signOutText, { color: textOnPrimary }]}>
            Sign Out
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const reasons = [
  "Multiple severe policy violations",
  "Fraudulent orders or payments",
  "Legal or regulatory restrictions",
  "Requested closure by owning entity",
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: "center",
    paddingBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginTop: 40,
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  badgeIcon: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  card: {
    width: "100%",
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  bulletIcon: {
    marginRight: 12,
    marginTop: 6,
  },
  reasonText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  contactButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 16,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    width: "100%",
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
