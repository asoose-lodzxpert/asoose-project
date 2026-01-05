import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { useSendPackage } from "@/context/SendPackageContext";

type Props = {
  type: "pickup" | "delivery";
};

export function LocationDetailsForm({ type }: Props) {
  const {
    pickupDetails,
    deliveryDetails,
    setPickupDetails,
    setDeliveryDetails,
  } = useSendPackage();

  const details = type === "pickup" ? pickupDetails : deliveryDetails;
  const setDetails =
    type === "pickup" ? setPickupDetails : setDeliveryDetails;

  function update<K extends keyof typeof details>(
    key: K,
    value: (typeof details)[K]
  ) {
    setDetails({ ...details, [key]: value });
  }

  return (
    <View style={styles.container}>
      <ThemedText type="caption">Contact name</ThemedText>
      <ThemedInput
        placeholder="e.g. John Doe"
        value={details.name}
        onChangeText={(v) => update("name", v)}
      />

      <ThemedText type="caption">Contact phone</ThemedText>
      <ThemedInput
        placeholder="e.g. 08012345678"
        keyboardType="phone-pad"
        value={details.phone}
        onChangeText={(v) => update("phone", v)}
      />

      <ThemedText type="caption">Additional instructions</ThemedText>
      <ThemedInput
        placeholder="Apartment, gate code, landmarks…"
        multiline
        value={details.instructions}
        onChangeText={(v) => update("instructions", v)}
        style={styles.multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    gap: 8,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
});
