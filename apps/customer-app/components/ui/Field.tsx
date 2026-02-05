import { View } from "react-native";
import { ThemedText } from "../themed-text";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <ThemedText type="defaultSemiBold" style={{ marginBottom: 6 }}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}
