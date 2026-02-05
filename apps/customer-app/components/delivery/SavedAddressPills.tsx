import { ScrollView, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useSendPackage } from "@/context/SendPackageContext";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  type: "pickup" | "delivery";
};

export function SavedAddressPills({ type }: Props) {
  const { savedAddresses, setPickup, setDropoff } = useSendPackage();
  const backgroundColor = useThemeColor({}, "surfaceCard");
  const textMuted = useThemeColor({}, "textMuted");

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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {savedAddresses.map((addr) => (
        <Pressable
          key={addr.id}
          style={({ pressed }) => [
            styles.pill,
            {
              borderColor: textMuted,
              backgroundColor: backgroundColor,
              shadowColor: textMuted,
            },
            pressed && styles.pillPressed,
          ]}
          onPress={() => selectAddress(addr)}
        >
          <IconSymbol name="location.fill" size={16} color={textMuted} />
          <ThemedText
            type="caption"
            style={[styles.label, { color: textMuted }]}
          >
            {addr.label}
          </ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    marginVertical: 12,
  },
  container: {
    gap: 10,
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pillPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
});
