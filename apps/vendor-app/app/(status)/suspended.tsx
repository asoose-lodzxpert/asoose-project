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

export default function SuspendedScreen() {
  const { user, signOut } = useAuth();
  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const textSecondary = useThemeColor({}, "textSecondary");
  const statusError = useThemeColor({}, "statusError");

  const handleContactSupport = () => {
    Linking.openURL("mailto:security@asoose.com");
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Status Badge */}
        <View
          style={[styles.statusBadge, { backgroundColor: statusError + "20" }]}
        >
          <IconSymbol
            name="pause.circle.fill"
            size={20}
            color={statusError}
            style={styles.badgeIcon}
          />
          <ThemedText style={[styles.statusText, { color: statusError }]}>
            Account Suspended
          </ThemedText>
        </View>

        {/* Alert Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: statusError + "15" },
          ]}
        >
          <IconSymbol
            name="exclamationmark.triangle.fill"
            size={64}
            color={statusError}
          />
        </View>

        {/* Message */}
        <ThemedText type="title" style={styles.title}>
          Account Temporarily Suspended
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
          Your vendor account has been temporarily suspended
        </ThemedText>

        {/* Info Card */}
        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Why was my account suspended?
          </ThemedText>

          <View style={styles.reasonItem}>
            <IconSymbol
              name="circle.fill"
              size={8}
              color={textSecondary}
              style={styles.bulletIcon}
            />
            <ThemedText style={[styles.reasonText, { color: textSecondary }]}>
              Violation of our vendor policies or terms of service
            </ThemedText>
          </View>

          <View style={styles.reasonItem}>
            <IconSymbol
              name="circle.fill"
              size={8}
              color={textSecondary}
              style={styles.bulletIcon}
            />
            <ThemedText style={[styles.reasonText, { color: textSecondary }]}>
              Multiple customer complaints or negative reviews
            </ThemedText>
          </View>

          <View style={styles.reasonItem}>
            <IconSymbol
              name="circle.fill"
              size={8}
              color={textSecondary}
              style={styles.bulletIcon}
            />
            <ThemedText style={[styles.reasonText, { color: textSecondary }]}>
              Suspicious or fraudulent activity detected
            </ThemedText>
          </View>

          <View style={styles.reasonItem}>
            <IconSymbol
              name="circle.fill"
              size={8}
              color={textSecondary}
              style={styles.bulletIcon}
            />
            <ThemedText style={[styles.reasonText, { color: textSecondary }]}>
              Payment or payout discrepancies
            </ThemedText>
          </View>
        </View>

        {/* Action Card */}
        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
          <IconSymbol
            name="exclamationmark.triangle.fill"
            size={48}
            color={primary}
            style={styles.cardIcon}
          />
          <ThemedText type="subtitle" style={styles.cardTitle}>
            What can I do?
          </ThemedText>

          <ThemedText style={[styles.cardText, { color: textSecondary }]}>
            If you believe this suspension is a mistake or you'd like to appeal
            this decision, please contact our security team.
          </ThemedText>

          <Pressable
            style={({ pressed }) => [
              styles.contactButton,
              { backgroundColor: primary },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleContactSupport}
          >
            <IconSymbol
              name="paperplane.fill"
              size={20}
              color={textOnPrimary}
            />
            <ThemedText
              style={[styles.contactButtonText, { color: textOnPrimary }]}
            >
              Contact Security Team
            </ThemedText>
          </Pressable>

          <ThemedText
            style={[styles.emailText, { color: textSecondary }]}
            selectable
          >
            security@asoose.com
          </ThemedText>
        </View>

        {/* Sign Out Button */}
        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            { backgroundColor: surfaceCard },
            pressed && styles.buttonPressed,
          ]}
          onPress={signOut}
        >
          <ThemedText style={[styles.signOutText, { color: textSecondary }]}>
            Sign Out
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

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
    opacity: 0.6,
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
    fontSize: 26,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
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
  cardIcon: {
    alignSelf: "center",
    marginBottom: 16,
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
    marginBottom: 20,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emailText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
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
