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
  | "chevron.left"
  | "chevron.down"
  | "chevron.up"
  | "info.circle"
  | "cloud.upload"
  | "camera.fill"
  | "check"
  | "circle.fill"
  | "map.marker"
  | "location.fill"
  | "arrow.up.left.and.arrow.down.right"
  | "xmark"
  | "map.fill"
  | "lock.fill"
  | "pencil"
  | "trash"
  | "plus"
  | "fullscreen"
  | "send"
  | "home"
  | "restaurant"
  | "notifications"
  | "logout"
  | "chat"
  | "icon"
  | "menu"
  | "users"
  | "power"
  | "arrow.right"
  | "arrow.left"
  | "arrow.up"
  | "settings"
  | "bell"
  | "list"
  | "dollar-sign"
  | "info"
  | "headphones"
  | "play"
  | "activity"
  | "arrow.left"
  | "lightbulb"
  | "list"
  | "dollar-sign"
  | "menu"
  | "shield"
  | "info"
  | "close"
  | "edit"
  | "delete"
  | "add"
  | "send"
  | "share"
  | "file-text"
  | "credit-card"
  | "alert-circle";

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
  send: "send",

  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "keyboard-arrow-down",
  "chevron.up": "keyboard-arrow-up",

  "info.circle": "info",
  "cloud.upload": "cloud-upload",
  "camera.fill": "photo-camera",

  check: "check",
  "circle.fill": "circle",

  "map.marker": "place",
  "location.fill": "location-on",
  "map.fill": "map",

  "arrow.up.left.and.arrow.down.right": "fullscreen",
  fullscreen: "fullscreen",

  xmark: "close",

  "lock.fill": "lock",

  pencil: "edit",
  trash: "delete",
  plus: "add",

  home: "home",
  restaurant: "restaurant",
  notifications: "notifications",
  logout: "logout",
  chat: "chat",
  icon: "help",
  menu: "menu",
  users: "people",
  power: "power",
  "arrow.right": "arrow-right",
  "arrow.left": "arrow-left",
  "arrow.up": "arrow-upward",
  settings: "settings",
  bell: "notifications",
  list: "list",
  "dollar-sign": "attach-money",
  info: "info",
  headphones: "headset-mic",
  play: "play-arrow",
  activity: "show-chart",
  close: "close",
  edit: "edit",
  delete: "delete",
  add: "add",
  shield: "security",
  lightbulb: "lightbulb",
  share: "share",
  "file-text": "text-snippet",
  "credit-card": "credit-card",
  "alert-circle": "incomplete-circle",
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
