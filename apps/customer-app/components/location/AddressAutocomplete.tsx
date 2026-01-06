import { View, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useState } from "react";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";

export function AddressAutocomplete({
  onSelect,
  onOpenMap,
}: {
  onSelect: (placeId: string) => void;
  onOpenMap: () => void;
}) {
  const [query, setQuery] = useState("");
  const { results, loading } = usePlacesAutocomplete(query);

  return (
    <View>
      {/* Input */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Enter address"
          style={{
            flex: 1,
            padding: 14,
            borderRadius: 12,
            backgroundColor: "#F3F4F6",
          }}
        />

        {/* Map button */}
        <Pressable onPress={onOpenMap} style={{ marginLeft: 8 }}>
          <IconSymbol name="map" size={22} color={"red"} />
        </Pressable>
      </View>

      {/* Loading */}
      {loading && (
        <View style={{ padding: 12 }}>
          <ActivityIndicator />
        </View>
      )}

      {/* Results */}
      {results.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => onSelect(r.id)}
          style={{
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <ThemedText>{r.title}</ThemedText>
          <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>
            {r.subtitle}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}
