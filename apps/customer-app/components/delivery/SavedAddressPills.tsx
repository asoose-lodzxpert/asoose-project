import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useSendPackage } from "@/context/SendPackageContext";

type Props = {
  type: "pickup" | "delivery";
};

export function SavedAddressPills({ type }: Props) {
  const { savedAddresses, setPickup, setDropoff } = useSendPackage();

  if (!savedAddresses.length) return null;

  function selectAddress(addr: any) {
    const payload = { address: addr };

    if (type === "pickup") {
      setPickup(payload);
    } else {
      setDropoff(payload);
    }
  }

  return (
    <View style={styles.container}>
      {savedAddresses.map((addr) => (
        <Pressable
          key={addr.id}
          style={styles.pill}
          onPress={() => selectAddress(addr)}
        >
          <ThemedText type="caption" style={styles.label}>
            {addr.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 8,
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
});
