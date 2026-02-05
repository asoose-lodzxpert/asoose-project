import { View, TextInput, Pressable, ActivityIndicator } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { ThemedInput } from "../ThemedInput";

export function AddressSearchInput({
  value,
  onChange,
  onMapPress,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onMapPress: () => void;
  loading: boolean;
}) {
  const border = useThemeColor({}, "borderDefault");
  const primary = useThemeColor({}, "brandPrimary");

  return (
    <ThemedInput
      value={value}
      onChangeText={onChange}
      placeholder="Search address"
      style={{ flex: 1, paddingVertical: 12 }}
      containerStyle={{
        marginTop: 8,
      }}
      iconRight={
        loading ? (
          <ActivityIndicator size="small" color={primary} />
        ) : (
          <Pressable onPress={onMapPress}>
            <IconSymbol name="map" size={20} color={primary} />
          </Pressable>
        )
      }
    />
  );
}
