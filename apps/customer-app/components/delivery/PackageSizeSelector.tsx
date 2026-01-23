import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { PackageSize } from "@/types/delivery";
import { useSendPackage } from "@/context/SendPackageContext";
import { useThemeColor } from "@/hooks/use-theme-color";

const SIZES: {
  key: PackageSize;
  label: string;
  desc: string;
  price: number;
}[] = [
  { key: "small", label: "Small", desc: "Documents / Envelope", price: 500 },
  { key: "medium", label: "Medium", desc: "Shoebox size", price: 1000 },
  { key: "large", label: "Large", desc: "Bulk items", price: 2500 },
  {
    key: "extra_large",
    label: "Extra Large",
    desc: "Very large or heavy items",
    price: 5000,
  },
];

export function PackageSizeSelector() {
  const { packageSize, setPackageSize } = useSendPackage();

  const card = useThemeColor({}, "surfaceCard");
  const primary = useThemeColor({}, "brandPrimary");
  const border = useThemeColor({}, "borderDefault");

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">Package Size</ThemedText>

      <View style={styles.row}>
        {SIZES.map((s) => {
          const active = s.key === packageSize;
          return (
            <Pressable
              key={s.key}
              style={[
                styles.card,
                active && styles.activeCard,
                {
                  backgroundColor: card,
                  borderColor: active ? primary : border,
                },
              ]}
              onPress={() => setPackageSize(s.key)}
            >
              <ThemedText style={{ fontWeight: "700" }}>{s.label}</ThemedText>
              <ThemedText type="caption">{s.desc}</ThemedText>
              <ThemedText
                type="caption"
                style={{ marginTop: 4, color: primary }}
              >
                ₦{s.price.toLocaleString()}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  card: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
  },
  activeCard: {
    borderWidth: 1,
  },
});
