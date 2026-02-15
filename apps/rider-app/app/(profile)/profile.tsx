import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RelativePathString, useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { LogoutButton } from "@/components/LogoutButton";
import {
  getRiderProfile,
  getProfileStats,
  type RiderProfile,
  type ProfileStats,
} from "@/services/profile.service";
import { Image } from "react-native";
import { getRoleLabel } from "@/utils/role";

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

/* Skeleton Loaders */
function SkeletonBox({
  width,
  height,
  borderRadius = 8,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
}) {
  return (
    <View
      style={{
        width: width as any,
        height,
        borderRadius,
        backgroundColor: "rgba(0,0,0,0.06)",
      }}
    />
  );
}

function ProfileCardSkeleton({ border }: { border: string }) {
  return (
    <View style={[styles.profileCard, { borderColor: border }]}>
      <SkeletonBox width={64} height={64} borderRadius={32} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="60%" height={24} borderRadius={4} />
        <SkeletonBox width="40%" height={16} borderRadius={4} />
        <SkeletonBox width="50%" height={20} borderRadius={4} />
        <SkeletonBox width="70%" height={18} borderRadius={4} />
      </View>
    </View>
  );
}

function StatsRowSkeleton({ border }: { border: string }) {
  return (
    <View style={styles.statsRow}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.statCard, { borderColor: border }]}>
          <SkeletonBox width={22} height={22} borderRadius={11} />
          <SkeletonBox width={40} height={20} borderRadius={4} />
          <SkeletonBox width={60} height={16} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

function SectionSkeleton({ border }: { border: string }) {
  return (
    <View style={[styles.section, { borderColor: border }]}>
      <SkeletonBox width={150} height={20} borderRadius={4} />
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.menuItem, { borderColor: border }]}>
          <View style={styles.menuLeft}>
            <SkeletonBox width={22} height={22} borderRadius={11} />
            <SkeletonBox width={150} height={18} borderRadius={4} />
          </View>
          <SkeletonBox width={18} height={18} borderRadius={9} />
        </View>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textMuted = useThemeColor({}, "textMuted");
  const statusSuccess = useThemeColor({}, "statusSuccess");
  const statusError = useThemeColor({}, "statusError");
  const statusWarning = useThemeColor({}, "statusWarning");

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileData, statsData] = await Promise.all([
        getRiderProfile(),
        getProfileStats(),
      ]);
      setProfile(profileData);
      setStats(statsData);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load profile",
        text2: error.message || "Please try again",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfileData();
  }, [fetchProfileData]);

  const isVerified =
    profile?.status === "ACTIVE" || profile?.status === "VERIFIED";

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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[primary]}
          />
        }
      >
        {/* Profile Card */}
        {loading && !profile ? (
          <ProfileCardSkeleton border={border} />
        ) : profile ? (
          <View style={[styles.profileCard, { borderColor: border }]}>
            <View style={[styles.avatar, { backgroundColor: primary }]}>
              {profile.image ? (
                <Image
                  source={{ uri: profile.image }}
                  style={{ width: 64, height: 64, borderRadius: 32 }}
                  resizeMode="cover"
                />
              ) : (
                <IconSymbol name="person" size={36} color={textOnPrimary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="title">{profile.name}</ThemedText>
              <ThemedText style={styles.subText}>
                {getRoleLabel(profile.role)} ID: #
                {profile.id.slice(0, 8).toUpperCase()}
              </ThemedText>
              {isVerified && (
                <View style={styles.badge}>
                  <IconSymbol
                    name="checkmark.seal"
                    size={14}
                    color={statusSuccess}
                  />
                  <ThemedText
                    style={[styles.badgeText, { color: statusSuccess }]}
                  >
                    Verified {getRoleLabel(profile.role)}
                  </ThemedText>
                </View>
              )}
              <View style={styles.ratingRow}>
                <IconSymbol name="star.fill" size={18} color={statusWarning} />
                <ThemedText style={styles.ratingText}>
                  {profile.rating.toFixed(2)}
                </ThemedText>
                <ThemedText style={[styles.subText, { color: textSecondary }]}>
                  ({profile.totalRides} rides)
                </ThemedText>
                <Pressable>
                  <ThemedText style={[styles.link, { color: primary }]}>
                    View Feedback
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {/* Stats */}
        {loading && !stats ? (
          <StatsRowSkeleton border={border} />
        ) : stats ? (
          <View style={styles.statsRow}>
            <StatCard
              label="Rides"
              value={stats.totalDeliveries.toString()}
              icon="box.truck"
              border={border}
            />
            <StatCard
              label="Hrs Online"
              value={stats.hoursOnline.toFixed(1)}
              icon="clock"
              border={border}
            />
            <StatCard
              label="This Week"
              value={stats.thisWeekDeliveries.toString()}
              icon="calendar"
              border={border}
            />
          </View>
        ) : null}

        {/* Account Management Section */}
        {loading && !profile ? null : profile ? (
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
        ) : null}

        {/* Settings & Actions Section */}
        {loading && !profile ? (
          <SectionSkeleton border={border} />
        ) : profile ? (
          <Section title="Settings & Actions" border={border}>
            <MenuItem
              icon="bell"
              label="Notifications"
              border={border}
              onPress={() => router.push("/(profile)/notifications")}
            />
            <MenuItem
              icon="trash"
              label="Delete Account"
              border={border}
              onPress={() =>
                router.push("/(profile)/delete-account" as RelativePathString)
              }
              destructive
            />
            {/* Logout button as a separate component */}
            <LogoutButton />
          </Section>
        ) : null}
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
  destructive = false,
}: {
  icon: any;
  label: string;
  onPress?: () => void;
  border: string;
  destructive?: boolean;
}) {
  const primary = useThemeColor({}, "brandPrimary");
  const statusError = useThemeColor({}, "statusError");
  const textMuted = useThemeColor({}, "textMuted");
  return (
    <Pressable
      style={[styles.menuItem, { borderColor: border }]}
      onPress={onPress}
    >
      <View style={styles.menuLeft}>
        <IconSymbol
          name={icon}
          size={22}
          color={destructive ? statusError : primary}
        />
        <ThemedText
          style={
            destructive ? { color: statusError, fontWeight: "600" } : undefined
          }
        >
          {label}
        </ThemedText>
      </View>
      <IconSymbol name="chevron.right" size={18} color={textMuted} />
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
  subText: { fontSize: 13 },
  badge: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 6 },
  badgeText: { fontSize: 13, fontWeight: "600" },
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
