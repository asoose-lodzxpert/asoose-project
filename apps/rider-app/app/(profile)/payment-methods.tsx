import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter } from "expo-router";

type PaymentMethod = {
  bank: string | null;
  accountNumber: string;
  accountName: string;
  isDefault?: boolean;
};

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);

  /* Simulate fetch */
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPaymentMethods([
        {
          bank: "Access Bank",
          accountNumber: "1234567890",
          accountName: "John Smith",
          isDefault: true,
        },
        {
          bank: "GT Bank",
          accountNumber: "0987654321",
          accountName: "John Smith",
        },
      ]);
      setLoading(false);
    }, 1200);

    return () => clearTimeout(timeout);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setPaymentMethods((prev) => [...prev]); // simulate reload
      setRefreshing(false);
    }, 1000);
  }, []);

  const addAccount = () => {
    setPaymentMethods((prev) => [
      ...prev,
      { bank: null, accountNumber: "", accountName: "" },
    ]);
    setEditing(true);
  };

  const deleteAccount = (index: number) => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete this account?",
      [
        { text: "Cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            setPaymentMethods((prev) => prev.filter((_, i) => i !== index)),
        },
      ]
    );
  };

  const setDefault = (index: number) => {
    setPaymentMethods((prev) =>
      prev.map((pm, i) => ({ ...pm, isDefault: i === index }))
    );
  };

  const updateAccount = (
    index: number,
    key: keyof PaymentMethod,
    value: string
  ) => {
    setPaymentMethods((prev) =>
      prev.map((pm, i) => (i === index ? { ...pm, [key]: value } : pm))
    );
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: surface }]}>
        <ThemedText style={{ textAlign: "center", marginTop: 200 }}>
          Loading payment methods...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: primary + "40" }]}>
        <Pressable onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
        </Pressable>
        <ThemedText type="title" style={{ flex: 1, textAlign: "center" }}>
          Payment Methods
        </ThemedText>
        <Pressable
          onPress={() => {
            if (editing) {
              Alert.alert("Saved", "Payment methods saved successfully");
            }
            setEditing(!editing);
          }}
        >
          <ThemedText style={{ color: primary, fontWeight: "600" }}>
            {editing ? "Done" : "Edit"}
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {paymentMethods.map((pm, index) => (
          <View
            key={index}
            style={[styles.card, pm.isDefault && { borderColor: primary }]}
          >
            <Field label="Bank">
              <ThemedInput
                placeholder="Bank Name"
                value={pm.bank || ""}
                onChangeText={(v) => updateAccount(index, "bank", v)}
                editable={editing}
              />
            </Field>
            <Field label="Account Number">
              <ThemedInput
                placeholder="1234567890"
                value={pm.accountNumber}
                onChangeText={(v) => updateAccount(index, "accountNumber", v)}
                editable={editing}
                keyboardType="numeric"
              />
            </Field>
            <Field label="Account Name">
              <ThemedInput
                placeholder="John Smith"
                value={pm.accountName}
                onChangeText={(v) => updateAccount(index, "accountName", v)}
                editable={editing}
              />
            </Field>

            {editing && (
              <View style={styles.actions}>
                <Pressable onPress={() => deleteAccount(index)}>
                  <ThemedText type="link" style={{ color: "#EF4444" }}>
                    Delete
                  </ThemedText>
                </Pressable>
                {!pm.isDefault && (
                  <Pressable onPress={() => setDefault(index)}>
                    <ThemedText type="link" style={{ color: primary }}>
                      Set as default
                    </ThemedText>
                  </Pressable>
                )}
                {pm.isDefault && (
                  <ThemedText style={{ color: "#22C55E", fontWeight: "600" }}>
                    Default
                  </ThemedText>
                )}
              </View>
            )}
          </View>
        ))}

        <Pressable style={styles.addButton} onPress={addAccount}>
          <IconSymbol name="plus" size={20} color="#fff" />
          <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
            Add Account
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

/* Field wrapper */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "transparent",
    gap: 12,
  },
  field: { marginTop: 12, gap: 6 },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  addButton: {
    marginTop: 20,
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
