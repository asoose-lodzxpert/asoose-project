import { View } from "react-native";
import { ThemedText } from "../themed-text";

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginVertical: 28 }}>
      <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}