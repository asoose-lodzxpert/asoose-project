import React from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { AddressCard } from "./AddressCard";
import { AddAddressButton } from "./AddAddressButton";
import { Address } from "@/types/address";
import { ThemedText } from "@/components/themed-text";

export function AddressList({
  addresses,
  border,
  primary,
  onEdit,
  onDelete,
  onAddHome,
  onAddWork,
  onAddOther,
}: {
  addresses: Address[];
  border: string;
  primary: string;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
  onAddHome: () => void;
  onAddWork: () => void;
  onAddOther: () => void;
}) {
  const home = addresses.find((a) => a.label === "Home");
  const work = addresses.find((a) => a.label === "Work");
  const others = addresses.filter(
    (a) => a.label !== "Home" && a.label !== "Work",
  );

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* SECTION 1: PRIMARY LOCATIONS */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Primary Locations</ThemedText>

        {home ? (
          <AddressCard
            address={home}
            border={border}
            primary={primary}
            onEdit={() => onEdit(home)}
            onDelete={() => onDelete(home.id)}
          />
        ) : (
          <AddAddressButton
            label="Add Home Address"
            primary={primary}
            onPress={onAddHome}
          />
        )}

        {work ? (
          <AddressCard
            address={work}
            border={border}
            primary={primary}
            onEdit={() => onEdit(work)}
            onDelete={() => onDelete(work.id)}
          />
        ) : (
          <AddAddressButton
            label="Add Work Address"
            primary={primary}
            onPress={onAddWork}
          />
        )}
      </View>

      {/* SECTION 2: OTHER LOCATIONS */}
      <View style={[styles.section, { marginTop: 24 }]}>
        <ThemedText style={styles.sectionTitle}>
          Other Saved Addresses
        </ThemedText>

        {others.map((a) => (
          <AddressCard
            key={a.id || a.label}
            address={a}
            border={border}
            primary={primary}
            onEdit={() => onEdit(a)}
            onDelete={() => onDelete(a.id)}
          />
        ))}

        <AddAddressButton
          label="Add new address"
          primary={primary}
          onPress={onAddOther}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    textTransform: "uppercase",
    fontWeight: "700",
    opacity: 0.5,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
});
