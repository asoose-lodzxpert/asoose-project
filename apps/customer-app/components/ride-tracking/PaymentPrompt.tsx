import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

type PaymentPromptProps = {
  fare: number;
  formattedFare: string;
  onPay: () => void;
  paying: boolean;
};

export default function PaymentPrompt({
  fare,
  formattedFare,
  onPay,
  paying,
}: PaymentPromptProps) {
  const primaryColor = useThemeColor({}, "brandPrimary");

  return (
    <View
      style={[
        styles.payCard,
        {
          backgroundColor: primaryColor + "10",
          borderColor: primaryColor + "40",
        },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <IconSymbol name="creditcard.fill" size={18} color={primaryColor} />
        <ThemedText
          type="defaultSemiBold"
          style={{ color: primaryColor, fontSize: 14 }}
        >
          Complete payment to confirm ride
        </ThemedText>
      </View>

      <Pressable
        onPress={onPay}
        disabled={paying}
        style={[styles.payBtn, { backgroundColor: primaryColor }]}
      >
        {paying ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <ThemedText
            type="defaultSemiBold"
            style={{ color: "#fff", fontSize: 15 }}
          >
            Pay {formattedFare}
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  payCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
  },
  payBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
});
