import { View, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  step: number;
  total: number;
};

export function SignupStepper({ step, total }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const muted = useThemeColor({}, "borderDefault");

  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.bar, { backgroundColor: i < step ? primary : muted }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 24,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
});
