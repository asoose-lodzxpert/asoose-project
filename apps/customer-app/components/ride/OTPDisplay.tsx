import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  otp: string;
};

export function OTPDisplay({ otp }: Props) {
  const card = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const primary = useThemeColor({}, "brandPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  // Display masked OTP (we don't show the actual OTP to customer, driver enters it)
  const displayOTP = "****";

  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <ThemedText type="caption" style={[styles.label, { color: textSecondary }]}>
        Start OTP
      </ThemedText>
      
      <ThemedText type="subtitle" style={[styles.instructions, { color: textSecondary }]}>
        Share this code with your driver to start the trip
      </ThemedText>

      <View style={styles.otpContainer}>
        {displayOTP.split("").map((digit, index) => (
          <View
            key={index}
            style={[
              styles.otpBox,
              { backgroundColor: card, borderColor: primary },
            ]}
          >
            <ThemedText style={[styles.otpDigit, { color: primary }]}>
              {digit}
            </ThemedText>
          </View>
        ))}
      </View>

      <ThemedText type="caption" style={[styles.note, { color: textSecondary }]}>
        The driver will enter this code to begin your trip
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  instructions: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  otpContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: "700",
  },
  note: {
    fontSize: 11,
    textAlign: "center",
  },
});
