import { Stack } from "expo-router";
import { RideProvider } from "@/context/RideContext";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function RideLayout() {
  const background = useThemeColor({}, "surfaceBackground");

  return (
    <RideProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="location-picker" />
        <Stack.Screen name="payment" />
        <Stack.Screen name="tracking" />
        <Stack.Screen name="success" />
      </Stack>
    </RideProvider>
  );
}
