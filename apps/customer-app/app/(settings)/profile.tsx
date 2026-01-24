import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import { get, patch } from "@/lib/authFetch";

export default function ProfileScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const border = useThemeColor({}, "borderDefault");
  const card = useThemeColor({}, "surfaceCard");
  const accentRed = useThemeColor({}, "statusError");
  const accentGreen = useThemeColor({}, "statusSuccess");
  const textColor = useThemeColor({}, "textPrimary");

  const [profile, setProfile] = useState<{
    name: string;
    phone: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await get("users/profile");
        setProfile({ name: data.name || "", phone: data.phone || "" });
        setError(null);
      } catch (err) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await patch("users/profile", {
        name: profile.name,
        phone: profile.phone,
      });
      setSuccess(true);
    } catch (err) {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={22} color={primary} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>
          Edit Profile
        </ThemedText>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <ThemedText style={styles.label}>Name</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: border, color: textColor }]}
            value={profile?.name ?? ""}
            onChangeText={(text) =>
              setProfile((p) => (p ? { ...p, name: text } : p))
            }
            editable={!loading && !saving}
            placeholder="Enter your name"
            placeholderTextColor={border}
          />

          <ThemedText style={styles.label}>Phone Number</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: border, color: textColor }]}
            value={profile?.phone ?? ""}
            onChangeText={(text) =>
              setProfile((p) => (p ? { ...p, phone: text } : p))
            }
            editable={!loading && !saving}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            placeholderTextColor={border}
          />

          {error && (
            <ThemedText style={[styles.error, { color: accentRed }]}>
              {error}
            </ThemedText>
          )}
          {success && (
            <ThemedText style={[styles.success, { color: accentGreen }]}>
              Saved!
            </ThemedText>
          )}
          {(loading || saving) && (
            <ActivityIndicator style={{ marginTop: 16 }} color={primary} />
          )}

          <Pressable
            style={[styles.saveBtn, { backgroundColor: primary }]}
            onPress={handleSave}
            disabled={loading || saving}
          >
            <ThemedText style={[styles.saveText, { color: "#fff" }]}>
              Save Changes
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  scrollContent: { paddingBottom: 32 },
  card: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  saveBtn: {
    marginTop: 24,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    fontSize: 15,
    fontWeight: "600",
  },
  error: {
    marginTop: 12,
    textAlign: "center",
    fontWeight: "600",
  },
  success: {
    marginTop: 12,
    textAlign: "center",
    fontWeight: "600",
  },
});
