import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  getBankAccount,
  updateBankAccount,
} from "@/services/bank-account.service";
import type { BankAccount } from "@/types/bank-account";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

// Skeleton loader component
const SkeletonBox = ({
  width,
  height,
  radius = 8,
}: {
  width: number | string;
  height: number;
  radius?: number;
}) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;
  const surfaceSubtle = useThemeColor({}, "surfaceSubtle");

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          height,
          backgroundColor: surfaceSubtle,
          borderRadius: radius,
          opacity,
        },
        typeof width === "number" ? { width } : { width: width as any },
      ]}
    />
  );
};

const BankCardSkeleton = ({ border }: { border: string }) => {
  return (
    <View style={[styles.card, { borderColor: border }]}>
      {[80, 75, 110, 95].map((w, i) => (
        <View key={i} style={styles.field}>
          <SkeletonBox width={w} height={16} />
          <SkeletonBox width="100%" height={48} radius={12} />
        </View>
      ))}
    </View>
  );
};

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const border = useThemeColor({}, "borderDefault");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textMuted = useThemeColor({}, "textMuted");

  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchBankAccount = useCallback(async () => {
    try {
      setLoading(true);
      const account = await getBankAccount();
      setBankAccount(account);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load bank account",
        text2: error.message || "Please try again",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBankAccount();
  }, [fetchBankAccount]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBankAccount();
  }, [fetchBankAccount]);

  const updateAccount = (key: keyof BankAccount, value: string) => {
    if (bankAccount) {
      setBankAccount({ ...bankAccount, [key]: value });
    }
  };

  const saveChanges = async () => {
    if (!bankAccount) return;

    try {
      const updatedAccount = await updateBankAccount({
        bankName: bankAccount.bankName,
        bankCode: bankAccount.bankCode,
        accountNumber: bankAccount.accountNumber,
        accountName: bankAccount.accountName,
      });

      setBankAccount(updatedAccount);
      Toast.show({
        type: "success",
        text1: "Saved",
        text2: "Bank account updated successfully",
      });
      setEditing(false);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: error.message || "Failed to update bank account",
      });
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: primary + "40" }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={primary} />
          <ThemedText
            style={{ color: primary, marginLeft: 4, fontWeight: "500" }}
          >
            Back
          </ThemedText>
        </Pressable>

        <ThemedText type="subtitle" style={styles.headerTitle}>
          Bank Account
        </ThemedText>

        <View style={styles.headerRight}>
          {!loading && bankAccount && (
            <Pressable onPress={editing ? saveChanges : () => setEditing(true)}>
              <ThemedText style={{ color: primary, fontWeight: "600" }}>
                {editing ? "Save" : "Edit"}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primary}
          />
        }
      >
        {loading && !bankAccount ? (
          <BankCardSkeleton border={border} />
        ) : bankAccount ? (
          <View style={[styles.card, { borderColor: primary }]}>
            <Field label="Bank Name">
              <ThemedInput
                placeholder="Bank Name"
                value={bankAccount.bankName}
                onChangeText={(v) => updateAccount("bankName", v)}
                editable={editing}
              />
            </Field>
            <Field label="Bank Code">
              <ThemedInput
                placeholder="e.g., 044 (Optional)"
                value={bankAccount.bankCode || ""}
                onChangeText={(v) => updateAccount("bankCode", v)}
                editable={editing}
                keyboardType="numeric"
              />
            </Field>
            <Field label="Account Number">
              <ThemedInput
                placeholder="1234567890"
                value={bankAccount.accountNumber}
                onChangeText={(v) => updateAccount("accountNumber", v)}
                editable={editing}
                keyboardType="numeric"
              />
            </Field>
            <Field label="Account Name">
              <ThemedInput
                placeholder="John Smith"
                value={bankAccount.accountName}
                onChangeText={(v) => updateAccount("accountName", v)}
                editable={editing}
              />
            </Field>

            <View style={[styles.infoBox, { backgroundColor: primary + "15" }]}>
              <IconSymbol name="info.circle" size={20} color={primary} />
              <ThemedText style={[styles.infoText, { color: primary }]}>
                This is your default withdrawal account. All earnings will be
                transferred here.
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol name="creditcard" size={48} color={textMuted} />
            <ThemedText type="subtitle" style={{ color: textSecondary }}>
              No Bank Account
            </ThemedText>
            <ThemedText style={{ color: textMuted, textAlign: "center" }}>
              You haven't added a bank account yet. Contact support to add your
              withdrawal account.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

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
  headerTitle: { flex: 1, textAlign: "center" },
  headerRight: { width: 50, alignItems: "flex-end" },
  backButton: { flexDirection: "row", alignItems: "center", width: 50 },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: "transparent",
    gap: 12,
  },
  field: { marginTop: 12, gap: 6 },
  infoBox: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
});
