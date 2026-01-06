import React from "react";
import { ScrollView } from "react-native";
import { AddressCard } from "./AddressCard";
import { AddAddressButton } from "./AddAddressButton";
import { Address } from "@/types/address";

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
  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
    >
      {!home && (
        <AddAddressButton
          label="Add Home Address"
          primary={primary}
          onPress={onAddHome}
        />
      )}
      {!work && (
        <AddAddressButton
          label="Add Work Address"
          primary={primary}
          onPress={onAddWork}
        />
      )}
      {addresses.map((a) => (
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
    </ScrollView>
  );
}
