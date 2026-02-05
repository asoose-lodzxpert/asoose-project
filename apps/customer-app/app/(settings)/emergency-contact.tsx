import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";
import { ThemedInput } from "@/components/ThemedInput";
import {
  fetchEmergencyContacts,
  saveEmergencyContacts,
} from "@/services/emergency-contact.service";
import { EmergencyContact } from "@/types/emergency-contact";

/* ------------------ Types ------------------ */

/* ------------------ Helpers ------------------ */
const emptyContact = (): EmergencyContact => ({
  id: Date.now().toString(),
  name: "",
  phone: "",
  relationship: "",
});

/* ------------------ Screen ------------------ */
export default function EmergencyContactsScreen() {
  const router = useRouter();

  const primary = useThemeColor({}, "brandPrimary");
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const danger = useThemeColor({}, "statusError");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [drafts, setDrafts] = useState<EmergencyContact[]>([]);

  /* ------------------ Load ------------------ */
  useEffect(() => {
    fetchEmergencyContacts()
      .then((data) => {
        const normalized = data && data.length > 0 ? data : [emptyContact()];

        setContacts(normalized);
        setDrafts(normalized);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch emergency contacts:", error);
        const fallback = [emptyContact()];
        setContacts(fallback);
        setDrafts(fallback);
        setLoading(false);
      });
  }, []);

  /* ------------------ Actions ------------------ */
  const startEdit = () => setEditing(true);

  const cancelEdit = () => {
    setDrafts(contacts);
    setEditing(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await saveEmergencyContacts(drafts);
      setContacts(drafts);
      setEditing(false);
    } catch (error) {
      console.error("Failed to save emergency contacts:", error);
    } finally {
      setSaving(false);
    }
  };

  const addSecondContact = () => {
    if (drafts.length >= 2) return;
    setDrafts([...drafts, emptyContact()]);
  };

  const removeSecondContact = () => {
    if (drafts.length === 2) {
      setDrafts([drafts[0]]);
    }
  };

  const updateDraft = (
    index: number,
    field: keyof EmergencyContact,
    value: string,
  ) => {
    setDrafts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  };

  /* ------------------ Loading ------------------ */
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Header title="Emergency Contacts" onBack={() => router.back()} />
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Header title="Emergency Contacts" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.card, { backgroundColor: card, borderColor: border }]}
        >
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <IconSymbol name="shield" size={20} color={primary} />
              <ThemedText style={styles.cardTitle}>Trusted Contacts</ThemedText>
            </View>

            {!editing && (
              <Pressable onPress={startEdit}>
                <ThemedText style={[styles.editText, { color: primary }]}>
                  Edit
                </ThemedText>
              </Pressable>
            )}
          </View>

          {/* Contacts */}
          {drafts.map((contact, index) => (
            <View
              key={contact.id}
              style={[styles.contactBlock, { borderTopColor: border }]}
            >
              <View style={styles.contactHeader}>
                <ThemedText style={styles.contactLabel}>
                  {index === 0 ? "Primary Contact" : "Secondary Contact"}
                </ThemedText>

                {editing && index === 1 && (
                  <Pressable onPress={removeSecondContact}>
                    <IconSymbol name="trash" size={18} color={danger} />
                  </Pressable>
                )}
              </View>

              <Label text="Full name" />
              <ThemedInput
                value={contact.name}
                editable={editing}
                containerStyle={styles.input}
                onChangeText={(v) => updateDraft(index, "name", v)}
              />

              <Label text="Phone number" />
              <ThemedInput
                value={contact.phone}
                editable={editing}
                keyboardType="phone-pad"
                containerStyle={styles.input}
                onChangeText={(v) => updateDraft(index, "phone", v)}
              />

              <Label text="Relationship" />
              <ThemedInput
                value={contact.relationship}
                editable={editing}
                containerStyle={styles.input}
                onChangeText={(v) => updateDraft(index, "relationship", v)}
              />
            </View>
          ))}

          {/* Add second contact */}
          {editing && drafts.length === 1 && (
            <Pressable style={styles.addBtn} onPress={addSecondContact}>
              <IconSymbol name="plus" size={18} color={primary} />
              <ThemedText style={styles.addText}>Add second contact</ThemedText>
            </Pressable>
          )}

          {/* Actions */}
          {editing && (
            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.actionBtn,
                  styles.cancelBtn,
                  { borderColor: border },
                ]}
                onPress={cancelEdit}
              >
                <ThemedText>Cancel</ThemedText>
              </Pressable>

              <Pressable
                style={[styles.actionBtn, { backgroundColor: primary }]}
                onPress={saveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.saveText}>Save</ThemedText>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

/* ------------------ Reusable ------------------ */

function Label({ text }: { text: string }) {
  const muted = useThemeColor({}, "textMuted");
  return (
    <ThemedText style={[styles.label, { color: muted }]}>{text}</ThemedText>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const primary = useThemeColor({}, "brandPrimary");

  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <IconSymbol name="chevron.left" size={22} color={primary} />
      </Pressable>
      <ThemedText type="title" style={styles.headerTitle}>
        {title}
      </ThemedText>
    </View>
  );
}

function Skeleton() {
  return <View style={styles.skeleton} />;
}

/* ------------------ Styles ------------------ */

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
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  editText: { fontSize: 14, fontWeight: "600" },

  contactBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  contactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: "600",
  },

  label: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "500",
  },

  input: {
    marginBottom: 12,
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  addText: {
    marginLeft: 6,
    fontWeight: "600",
    color: "#1a73e8",
  },

  actionRow: {
    flexDirection: "row",
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtn: {
    marginRight: 12,
    borderWidth: 1,
  },
  saveText: {
    color: "#fff",
    fontWeight: "600",
  },

  skeleton: {
    height: 18,
    borderRadius: 6,
    backgroundColor: "#E6E6E6",
    marginBottom: 12,
  },
});
