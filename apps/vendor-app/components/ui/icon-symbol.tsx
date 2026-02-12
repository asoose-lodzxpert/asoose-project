import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

/**
 * An icon symbol component that uses MaterialIcons on Android/web
 * while maintaining an SF Symbols-style naming convention.
 */
export type IconSymbolName =
  | "square.grid.2x2.fill"
  | "bus.fill"
  | "box.truck.fill"
  | "person.fill"
  | "doc.fill"
  | "minus.circle.fill"
  | "house.fill"
  | "ticket.fill"
  | "fork.knife"
  | "banknote"
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
  | "checkmark"
  | "circle.fill"
  | "map.marker"
  | "location.fill"
  | "arrow.up.left.and.arrow.down.right"
  | "xmark"
  | "xmark.circle"
  | "map.fill"
  | "lock.fill"
  | "pencil"
  | "trash"
  | "trash.fill"
  | "info.circle.fill"
  | "plus"
  | "fullscreen"
  | "exclamationmark.triangle"
  | "exclamationmark.triangle.fill"
  | "clock"
  | "shield.checkmark"
  | "checkmark.circle.fill"
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
  | "lightbulb"
  | "shield"
  | "close"
  | "edit"
  | "delete"
  | "add"
  | "share"
  | "file-text"
  | "credit-card"
  | "alert-circle"
  | "pause.circle.fill"
  | "clock.fill"
  | "list.clipboard.fill"
  | "hand.raised.fill"
  | "touchid"
  | "shield.fill"
  | "apple.logo"
  | "power-on";

const MAPPING: Record<IconSymbolName, keyof typeof MaterialIcons.glyphMap> = {
  // Onboarding & Services
  "square.grid.2x2.fill": "apps",
  "bus.fill": "directions-bus",
  "box.truck.fill": "local-shipping",
  "person.fill": "person",
  "apple.logo": "apple",
  touchid: "fingerprint",
  banknote: "account-balance-wallet",
  "doc.fill": "description",
  "minus.circle.fill": "remove-circle",
  "house.fill": "home",
  "ticket.fill": "confirmation-number",
  "fork.knife": "restaurant",
  "chart.line.uptrend.xyaxis": "show-chart",
  "person.crop.circle.fill": "account-circle",

  // Auth & UI
  "eye.fill": "remove-red-eye",
  "eye.slash.fill": "visibility-off",
  "paperplane.fill": "send",
  send: "send",
  "lock.fill": "lock",
  "shield.fill": "security",
  shield: "security",

  // Navigation
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "keyboard-arrow-down",
  "chevron.up": "keyboard-arrow-up",
  "arrow.right": "arrow-right",
  "arrow.left": "arrow-left",
  "arrow.up": "arrow-upward",

  // Common UI
  "info.circle": "info",
  "info.circle.fill": "info",
  "cloud.upload": "cloud-upload",
  "camera.fill": "photo-camera",
  check: "check",
  checkmark: "check",
  "circle.fill": "circle",
  "map.marker": "place",
  "location.fill": "location-on",
  "map.fill": "map",
  "arrow.up.left.and.arrow.down.right": "fullscreen",
  fullscreen: "fullscreen",
  xmark: "close",
  "xmark.circle": "cancel",
  pencil: "edit",
  trash: "delete",
  "trash.fill": "delete-forever",
  plus: "add",
  "exclamationmark.triangle": "warning",
  "exclamationmark.triangle.fill": "warning",
  clock: "schedule",
  "clock.fill": "schedule",
  "shield.checkmark": "verified-user",
  "checkmark.circle.fill": "check-circle",

  // Misc
  home: "home",
  restaurant: "restaurant",
  notifications: "notifications",
  logout: "logout",
  chat: "chat",
  icon: "help",
  menu: "menu",
  users: "people",
  power: "power",
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
  lightbulb: "lightbulb",
  share: "share",
  "file-text": "text-snippet",
  "credit-card": "credit-card",
  "alert-circle": "error-outline",
  "pause.circle.fill": "pause-circle-filled",
  "list.clipboard.fill": "assignment",
  "hand.raised.fill": "front-hand",
  "power-on": "power-settings-new",
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
      name={MAPPING[name]}
      size={size}
      color={color}
      style={style}
    />
  );
}
