import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";

type Props = {
  otp: string;
};

export function OTPDisplay({ otp }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: textSecondary }]}>
        Trip Start Code
      </ThemedText>

      <Pressable onPress={handleCopy} style={styles.otpPressable}>
        <View style={styles.otpRow}>
          {otp.split("").map((digit, i) => (
            <ThemedText key={i} style={[styles.digit, { color: primary }]}>
              {digit}
            </ThemedText>
          ))}
        </View>

        {/* Subtle feedback replaces a permanent button */}
        <ThemedText
          style={[
            styles.copyFeedback,
            { color: copied ? primary : "transparent" },
          ]}
        >
          {copied ? "Copied to clipboard" : " "}
        </ThemedText>
      </Pressable>

      <ThemedText style={[styles.caption, { color: textSecondary }]}>
        Share this with your driver to begin the trip.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    opacity: 0.8,
  },
  otpPressable: {
    alignItems: "center",
    paddingVertical: 8,
    width: "100%",
  },
  otpRow: {
    flexDirection: "row",
    gap: 16, // Large gap replaces the boxes
  },
  digit: {
    fontSize: 36,
    fontWeight: "700",
    fontFamily: "Platform", // Use a monospaced font if available
  },
  copyFeedback: {
    fontSize: 11,
    marginTop: 8,
    fontWeight: "600",
  },
  caption: {
    fontSize: 13,
    textAlign: "center",
    opacity: 0.7,
  },
});
