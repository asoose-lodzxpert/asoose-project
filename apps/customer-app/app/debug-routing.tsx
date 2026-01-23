import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export default function DebugRoutingScreen() {
  const { user, loading } = useAuth();
  const [tokens, setTokens] = useState<{
    accessToken: string | null;
    refreshToken: string | null;
  }>({ accessToken: null, refreshToken: null });
  const [userRaw, setUserRaw] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setTokens({
        accessToken: await AsyncStorage.getItem("@auth/access_token"),
        refreshToken: await AsyncStorage.getItem("@auth/refresh_token"),
      });
      setUserRaw(await AsyncStorage.getItem("@auth/user"));
    })();
  }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Routing State</Text>
      <Text>User loading: {String(loading)}</Text>
      <Text>User context: {user ? JSON.stringify(user, null, 2) : "null"}</Text>
      <Text>AsyncStorage user: {userRaw}</Text>
      <Text>Access token: {tokens.accessToken}</Text>
      <Text>Refresh token: {tokens.refreshToken}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 12,
  },
});
