import React from "react";
import { View, StyleSheet, Image, Pressable, ScrollView } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function PendingScreen() {
  const { user, signOut } = useAuth();
  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const textSecondary = useThemeColor({}, "textSecondary");
  const statusPending = useThemeColor({}, "statusPending");

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
          style={[
            styles.statusBadge,
            { backgroundColor: statusPending + "20" },
          ]}
        >
          <IconSymbol
            name="clock.fill"
            size={20}
            color={statusPending}
            style={styles.badgeIcon}
          />
          <ThemedText style={[styles.statusText, { color: statusPending }]}>
            Pending Verification
          </ThemedText>
        </View>

        {/* Welcome Message */}
        <ThemedText type="title" style={styles.title}>
          Welcome, {user?.name}!
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
          Your vendor account is under review
        </ThemedText>

        {/* Info Card */}
        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
          <IconSymbol
            name="checkmark.circle.fill"
            size={48}
            color={primary}
            style={styles.cardIcon}
          />

          <ThemedText type="subtitle" style={styles.cardTitle}>
            What's Happening?
          </ThemedText>

          <ThemedText style={[styles.cardText, { color: textSecondary }]}>
            Our admin team is currently reviewing your vendor application. This
            process typically takes 24-48 hours.
          </ThemedText>
        </View>

        {/* Next Steps */}
        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
          <IconSymbol
            name="list.clipboard.fill"
            size={32}
            color={primary}
            style={styles.cardIcon}
          />
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Next Steps
          </ThemedText>

          <View style={styles.stepItem}>
            <View
              style={[styles.stepNumber, { backgroundColor: primary + "20" }]}
            >
              <ThemedText style={[styles.stepNumberText, { color: primary }]}>
                1
              </ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText style={styles.stepTitle}>
                Document Verification
              </ThemedText>
              <ThemedText style={[styles.stepText, { color: textSecondary }]}>
                We're verifying your business documents and information
              </ThemedText>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View
              style={[styles.stepNumber, { backgroundColor: primary + "20" }]}
            >
              <ThemedText style={[styles.stepNumberText, { color: primary }]}>
                2
              </ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText style={styles.stepTitle}>Admin Review</ThemedText>
              <ThemedText style={[styles.stepText, { color: textSecondary }]}>
                Our team will review your store details and policies
              </ThemedText>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View
              style={[styles.stepNumber, { backgroundColor: primary + "20" }]}
            >
              <ThemedText style={[styles.stepNumberText, { color: primary }]}>
                3
              </ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText style={styles.stepTitle}>
                Email Notification
              </ThemedText>
              <ThemedText style={[styles.stepText, { color: textSecondary }]}>
                You'll receive an email once your account is approved
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Contact Support */}
        <View style={[styles.card, { backgroundColor: surfaceCard }]}>
          <IconSymbol
            name="paperplane.fill"
            size={32}
            color={primary}
            style={styles.cardIcon}
          />
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Need Help?
          </ThemedText>
          <ThemedText style={[styles.cardText, { color: textSecondary }]}>
            If you have any questions or concerns, please contact our vendor
            support team at:
          </ThemedText>
          <ThemedText style={[styles.emailText, { color: primary }]} selectable>
            vendor-support@asoose.com
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
    width: 100,
    height: 100,
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
  title: {
    fontSize: 28,
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
    marginBottom: 12,
    textAlign: "center",
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  stepItem: {
    flexDirection: "row",
    marginTop: 16,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: "700",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
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
