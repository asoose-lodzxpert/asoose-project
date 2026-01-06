import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RelativePathString, useRouter } from "expo-router";

const initialProfileData = {
  name: "John Smith",
  riderId: "#RDR-12345",
  verified: true,
  rating: 4.92,
  totalDeliveries: 156,
  hrsOnline: 12,
  thisWeek: 18,
  appPreferences: {
    notifications: true,
  },
};

const accountManagementItems = [
  {
    icon: "person.text.rectangle",
    label: "Personal Information",
    route: "/(profile)/personal-info",
  },
  {
    icon: "car",
    label: "Vehicle Details",
    route: "/(profile)/vehicle-info",
  },
  { icon: "doc.text", label: "Documents", route: "/(profile)/documents" },
  {
    icon: "creditcard",
    label: "Payment Methods",
    route: "/(profile)/payment-methods",
  },
];

export default function ProfileScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<typeof initialProfileData | null>(
    null
  );

  // Simulate loading
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setProfile(initialProfileData);
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timeout);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setProfile(initialProfileData);
      setRefreshing(false);
    }, 1000);
  }, []);

  if (loading || !profile) {
    return (
      <ThemedView
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size={24} color={primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <IconSymbol name="chevron.left" size={24} color={primary} />
        <ThemedText type="link">Back</ThemedText>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, { borderColor: border }]}>
          <View style={[styles.avatar, { backgroundColor: primary }]}>
            <IconSymbol name="person" size={36} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">{profile.name}</ThemedText>
            <ThemedText style={styles.subText}>
              Rider ID: {profile.riderId}
            </ThemedText>
            {profile.verified && (
              <View style={styles.badge}>
                <IconSymbol name="checkmark.seal" size={14} color="#16A34A" />
                <ThemedText style={styles.badgeText}>Verified Rider</ThemedText>
              </View>
            )}
            <View style={styles.ratingRow}>
              <IconSymbol name="star.fill" size={18} color="#FACC15" />
              <ThemedText style={styles.ratingText}>
                {profile.rating}
              </ThemedText>
              <ThemedText style={styles.subText}>
                ({profile.totalDeliveries} deliveries)
              </ThemedText>
              <Pressable>
                <ThemedText style={[styles.link, { color: primary }]}>
                  View Feedback
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard
            label="Deliveries"
            value={profile.totalDeliveries.toString()}
            icon="box.truck"
            border={border}
          />
          <StatCard
            label="Hrs Online"
            value={profile.hrsOnline.toString()}
            icon="clock"
            border={border}
          />
          <StatCard
            label="This Week"
            value={profile.thisWeek.toString()}
            icon="calendar"
            border={border}
          />
        </View>

        {/* Account Management */}
        <Section title="Account Management" border={border}>
          {accountManagementItems.map((item) => (
            <MenuItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              border={border}
              onPress={() => router.push(item.route as RelativePathString)}
            />
          ))}
        </Section>

        {/* App Preferences */}
        <Section title="App Preferences" border={border}>
          <MenuItem
            icon="bell"
            label="Notifications"
            border={border}
            onPress={() => router.push("/(profile)/notifications")}
          />
        </Section>
      </ScrollView>
    </ThemedView>
  );
}

function StatCard({
  label,
  value,
  icon,
  border,
}: {
  label: string;
  value: string;
  icon: any;
  border: string;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  return (
    <View style={[styles.statCard, { borderColor: border }]}>
      <IconSymbol name={icon} size={22} color={primary} />
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
      <ThemedText style={styles.subText}>{label}</ThemedText>
    </View>
  );
}

function Section({
  title,
  children,
  border,
}: {
  title: string;
  children: React.ReactNode;
  border: string;
}) {
  return (
    <View style={[styles.section, { borderColor: border }]}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  border,
}: {
  icon: any;
  label: string;
  onPress?: () => void;
  border: string;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  return (
    <Pressable
      style={[styles.menuItem, { borderColor: border }]}
      onPress={onPress}
    >
      <View style={styles.menuLeft}>
        <IconSymbol name={icon} size={22} color={primary} />
        <ThemedText>{label}</ThemedText>
      </View>
      <IconSymbol name="chevron.right" size={18} color="#9CA3AF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  profileCard: {
    flexDirection: "row",
    gap: 16,
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 40,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  subText: { color: "#6B7280", fontSize: 13 },
  badge: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 6 },
  badgeText: { color: "#16A34A", fontSize: 13, fontWeight: "600" },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  ratingText: { fontWeight: "700" },
  link: { fontWeight: "600", marginLeft: 4 },

  statsRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },

  section: { marginTop: 32, borderRadius: 20, padding: 8, borderWidth: 1 },
  sectionTitle: { padding: 12, paddingBottom: 6 },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderRadius: 14,
    marginBottom: 8,
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
});
