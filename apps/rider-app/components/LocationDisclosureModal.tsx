import React, { useState } from "react";
import {
  Modal,
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

interface LocationDisclosureModalProps {
  visible: boolean;
  onAccept: () => void;
}

export const LocationDisclosureModal: React.FC<
  LocationDisclosureModalProps
> = ({ visible, onAccept }) => {
  const primary = useThemeColor({}, "brandPrimary");
  const background = useThemeColor({}, "surfaceBackground");
  const card = useThemeColor({}, "surfaceCard");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const success = useThemeColor({}, "statusSuccess");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <SafeAreaView style={{ flex: 1, justifyContent: "center" }}>
          <ThemedView style={[styles.card, { backgroundColor: card }]}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.header}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${primary}15` },
                  ]}
                >
                  <IconSymbol name="location.fill" size={32} color={primary} />
                </View>
                <ThemedText type="title" style={{ marginTop: 16 }}>
                  Location Access Required
                </ThemedText>
              </View>

              {/* Main Message */}
              <ThemedText
                style={[
                  styles.mainMessage,
                  { color: textPrimary, marginTop: 20 },
                ]}
              >
                ASOOSE Rider App uses your location to provide real-time
                delivery services and to keep you and your customers safe.
              </ThemedText>

              {/* Key Features */}
              <View style={styles.featureList}>
                <FeaturePoint
                  icon="map.fill"
                  title="Real-Time Tracking"
                  description="Customers can see your live location during delivery"
                  color={primary}
                />
                <FeaturePoint
                  icon="paperplane.fill"
                  title="Order Matching"
                  description="Find nearby orders in your area automatically"
                  color={primary}
                />
                <FeaturePoint
                  icon="clock.fill"
                  title="Accurate ETAs"
                  description="Provide customers with accurate delivery times"
                  color={primary}
                />
                <FeaturePoint
                  icon="location.fill"
                  title="Background Tracking"
                  description="Location access continues even when the app is minimized"
                  color={primary}
                />
              </View>

              {/* Privacy Note */}
              <View
                style={[
                  styles.privacyBox,
                  { backgroundColor: `${primary}10`, borderColor: primary },
                ]}
              >
                <IconSymbol name="shield" size={18} color={primary} />
                <ThemedText
                  style={[styles.privacyText, { color: textSecondary }]}
                >
                  Your location data is encrypted and only used for delivery
                  services. You can manage permissions in Settings at any time.
                </ThemedText>
              </View>

              {/* Terms */}
              <ThemedText
                style={[
                  styles.termsText,
                  { color: textSecondary, marginVertical: 16 },
                ]}
              >
                By tapping "Continue", you agree to grant background location
                access to ASOOSE Rider App for delivery operations.
              </ThemedText>
            </ScrollView>

            {/* Button */}
            <Pressable
              style={[styles.button, { backgroundColor: primary }]}
              onPress={onAccept}
            >
              <IconSymbol name="checkmark" size={18} color="#fff" />
              <ThemedText style={[styles.buttonText, { color: "#fff" }]}>
                I Understand & Continue
              </ThemedText>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

interface FeaturePointProps {
  icon: string;
  title: string;
  description: string;
  color: string;
}

function FeaturePoint({ icon, title, description, color }: FeaturePointProps) {
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <IconSymbol name={icon as any} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText style={[styles.featureDesc, { color: textSecondary }]}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    borderRadius: 16,
    maxHeight: "90%",
    overflow: "hidden",
    marginHorizontal: 0,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  mainMessage: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  featureList: {
    gap: 16,
    marginVertical: 24,
  },
  feature: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  privacyBox: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  button: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
