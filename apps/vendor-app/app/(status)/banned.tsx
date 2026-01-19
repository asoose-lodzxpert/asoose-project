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

export default function BannedScreen() {
  const { user, signOut } = useAuth();
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
            name="xmark.circle"
            size={20}
            color={statusError}
            style={styles.badgeIcon}
          />
          <ThemedText style={[styles.statusText, { color: statusError }]}>
            Account Banned
          </ThemedText>
        </View>

        {/* Alert Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: statusError + "15" },
          ]}
        >
          <IconSymbol name="hand.raised.fill" size={64} color={statusError} />
        </View>

        {/* Message */}
        <ThemedText type="title" style={styles.title}>
          Account Permanently Banned
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
          Your vendor account has been permanently banned from the platform
        </ThemedText>

        {/* Info Card */}
        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Why was my account banned?
          </ThemedText>

          <View style={styles.reasonItem}>
            <IconSymbol
              name="circle.fill"
              size={8}
              color={statusError}
              style={styles.bulletIcon}
            />
            <ThemedText style={[styles.reasonText, { color: textSecondary }]}>
              Severe or repeated violations of our terms of service
            </ThemedText>
          </View>

          <View style={styles.reasonItem}>
            <IconSymbol
              name="circle.fill"
              size={8}
              color={statusError}
              style={styles.bulletIcon}
            />
            <ThemedText style={[styles.reasonText, { color: textSecondary }]}>
              Fraudulent or illegal activities detected
            </ThemedText>
          </View>

          <View style={styles.reasonItem}>
            <IconSymbol
              name="circle.fill"
              size={8}
              color={statusError}
              style={styles.bulletIcon}
            />
            <ThemedText style={[styles.reasonText, { color: textSecondary }]}>
              Selling prohibited or counterfeit products
            </ThemedText>
          </View>

          <View style={styles.reasonItem}>
            <IconSymbol
              name="circle.fill"
              size={8}
              color={statusError}
              style={styles.bulletIcon}
            />
            <ThemedText style={[styles.reasonText, { color: textSecondary }]}>
              Manipulation of ratings, reviews, or platform systems
            </ThemedText>
          </View>

          <View style={styles.reasonItem}>
            <IconSymbol
              name="circle.fill"
              size={8}
              color={statusError}
              style={styles.bulletIcon}
            />
            <ThemedText style={[styles.reasonText, { color: textSecondary }]}>
              Failure to comply after multiple warnings or suspensions
            </ThemedText>
          </View>
        </View>

        {/* Warning Card */}
        <View
          style={[styles.warningCard, { backgroundColor: statusError + "10" }]}
        >
          <IconSymbol
            name="exclamationmark.triangle.fill"
            size={32}
            color={statusError}
            style={styles.cardIcon}
          />
          <ThemedText style={[styles.warningText, { color: statusError }]}>
            This decision is permanent and cannot be reversed. All access to the
            vendor platform has been revoked.
          </ThemedText>
        </View>

        {/* Contact Card */}
        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Have Questions?
          </ThemedText>

          <ThemedText style={[styles.cardText, { color: textSecondary }]}>
            If you believe this ban was issued in error or you have questions
            about the decision, you may contact our security team.
          </ThemedText>

          <Pressable
            style={({ pressed }) => [
              styles.contactButton,
              {
                backgroundColor: surfaceCard,
                borderColor: statusError,
                borderWidth: 2,
              },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleContactSupport}
          >
            <ThemedText
              style={[styles.contactButtonText, { color: statusError }]}
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
    opacity: 0.4,
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
  warningCard: {
    width: "100%",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
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
