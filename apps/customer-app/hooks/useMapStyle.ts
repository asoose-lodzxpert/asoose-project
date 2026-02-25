import { useColorScheme } from "react-native";
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from "@/constants/mapStyles";

/**
 * Returns the correct Google Maps custom style array based on the current
 * device color scheme. Pass the result to <MapView customMapStyle={...} />.
 */
export function useMapStyle() {
  const colorScheme = useColorScheme();
  return colorScheme === "dark" ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;
}
