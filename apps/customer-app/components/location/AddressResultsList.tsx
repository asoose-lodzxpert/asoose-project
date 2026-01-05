import { Pressable, View } from "react-native";
import { ThemedText } from "@/components/themed-text";

export function AddressResultsList({
  results,
  onSelect,
}: {
  results: any[];
  onSelect: (placeId: string) => void;
}) {
  return (
    <View style={{ marginTop: 8 }}>
      {results.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => onSelect(r.id)}
          style={{
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <ThemedText>{r.title}</ThemedText>
          {r.subtitle && (
            <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>
              {r.subtitle}
            </ThemedText>
          )}
        </Pressable>
      ))}
    </View>
  );
}
