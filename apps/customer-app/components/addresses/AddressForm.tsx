import React from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";

export function AddressForm({
  label,
  address,
  onLabelChange,
  onAddressChange,
  onAddressFocus,
  suggestions,
  onSelectSuggestion,
  searchLoading,
  modalVisible,
}: {
  label: string;
  address: string;
  onLabelChange: (val: string) => void;
  onAddressChange: (val: string) => void;
  onAddressFocus: () => void;
  suggestions: any[];
  onSelectSuggestion: (placeId: string) => void;
  searchLoading: boolean;
  modalVisible: boolean;
}) {
  return (
    <View style={styles.labelContainer}>
      <ThemedText style={{ fontWeight: "600", marginBottom: 6 }}>
        Label
      </ThemedText>
      <ThemedInput
        value={label}
        placeholder="Home / Work / Other"
        containerStyle={{ flex: 1 }}
        onChangeText={onLabelChange}
      />
      <ThemedText style={{ fontWeight: "600", marginVertical: 6 }}>
        Address
      </ThemedText>
      <ThemedInput
        placeholder="Type address..."
        value={address}
        onChangeText={onAddressChange}
        containerStyle={{ flex: 1 }}
        onFocus={onAddressFocus}
      />
      {searchLoading && (
        <ActivityIndicator
          size="small"
          color="#1a73e8"
          style={{ marginTop: 8 }}
        />
      )}
      {modalVisible && (
        <ScrollView style={{ maxHeight: 200 }}>
          {suggestions.map((s) => (
            <Pressable
              key={s.place_id}
              style={styles.suggestionRow}
              onPress={() => onSelectSuggestion(s.place_id)}
            >
              <ThemedText>{s.description}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  suggestionRow: { padding: 12, borderBottomWidth: 1, borderColor: "#eee" },
});
