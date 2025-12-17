import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

export type IconSymbolName =
  | "house.fill"
  | "ticket.fill"
  | "fork.knife"
  | "chart.line.uptrend.xyaxis"
  | "person.crop.circle.fill"
  | "eye.fill"
  | "eye.slash.fill"
  | "paperplane.fill"
  | "chevron.left.forwardslash.chevron.right"
  | "chevron.right"
  | "info.circle"
  | "cloud.upload"
  | "camera.fill"
  | "check"
  | "circle.fill"
  | "map.marker"
  | "location.fill"
  | "arrow.up.left.and.arrow.down.right"
  | "xmark"
  | "map.fill";

export const MAPPING: Record<
  IconSymbolName,
  keyof typeof MaterialIcons.glyphMap
> = {
  "house.fill": "home",
  "ticket.fill": "confirmation-number",
  "fork.knife": "restaurant",
  "chart.line.uptrend.xyaxis": "show-chart",
  "person.crop.circle.fill": "account-circle",
  "eye.fill": "remove-red-eye",
  "eye.slash.fill": "visibility-off",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "info.circle": "info",
  "cloud.upload": "cloud-upload",
  "camera.fill": "photo-camera",
  check: "check",
  "circle.fill": "circle",
  "map.marker": "place",
  "location.fill": "location-on",
  "arrow.up.left.and.arrow.down.right": "fullscreen",
  xmark: "close",
  "map.fill": "map",
};

interface IconSymbolProps {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
}

export function IconSymbol({ name, size = 24, color, style }: IconSymbolProps) {
  return (
    <MaterialIcons
      name={MAPPING[name] as keyof typeof MaterialIcons.glyphMap} // <- type cast here
      size={size}
      color={color}
      style={style}
    />
  );
}
