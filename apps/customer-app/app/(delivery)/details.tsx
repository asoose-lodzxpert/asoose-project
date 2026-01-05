import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useRouter, useLocalSearchParams } from "expo-router";

// Dummy data for demonstration
const deliveries = [
  {
    id: "1",
    from: "12 Admiralty Way, Lekki",
    to: "Victoria Island, Lagos",
    price: 3500,
    status: "active",
    paymentMethod: "Card",
    details: {
      sender: "John Doe",
      senderPhone: "08012345678",
      receiver: "Jane Smith",
      receiverPhone: "08087654321",
      instructions: "Handle with care",
      packageSize: "medium",
      options: "Fragile, Perishable",
    },
  },
  {
    id: "2",
    from: "Ikeja City Mall",
    to: "Yaba, Lagos",
    price: 4200,
    status: "completed",
    paymentMethod: "Wallet",
    details: {
      sender: "Alice Brown",
      senderPhone: "08011223344",
      receiver: "Bob Green",
      receiverPhone: "08044332211",
      instructions: "No liquids",
      packageSize: "large",
      options: "None",
    },
  },
];

export default function DeliveryDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const surfaceCard = useThemeColor({}, "surfaceCard");
  const textPrimary = useThemeColor({}, "textPrimary");
  const delivery = deliveries.find((d) => d.id === params.id);

  if (!delivery) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="arrow-left" size={22} color={brandPrimary} />
          </Pressable>
          <ThemedText type="title" style={styles.headerTitle}>
            Delivery Details
          </ThemedText>
        </View>
        <ThemedText style={{ textAlign: "center", marginTop: 32 }}>
          Delivery not found.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="arrow-left" size={22} color={brandPrimary} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>
          Delivery Details
        </ThemedText>
      </View>
      <View style={[styles.card, { backgroundColor: surfaceCard }]}> 
        <ThemedText style={styles.cardTitle}>From</ThemedText>
        <ThemedText style={styles.cardValue}>{delivery.from}</ThemedText>
        <ThemedText style={styles.cardTitle}>To</ThemedText>
        <ThemedText style={styles.cardValue}>{delivery.to}</ThemedText>
        <ThemedText style={styles.cardTitle}>Price</ThemedText>
        <ThemedText style={styles.cardValue}>₦{delivery.price.toLocaleString()}</ThemedText>
        <ThemedText style={styles.cardTitle}>Payment Method</ThemedText>
        <ThemedText style={styles.cardValue}>{delivery.paymentMethod}</ThemedText>
        <View style={styles.divider} />
        <ThemedText style={styles.cardTitle}>Sender</ThemedText>
        <ThemedText style={styles.cardValue}>{delivery.details.sender} ({delivery.details.senderPhone})</ThemedText>
        <ThemedText style={styles.cardTitle}>Receiver</ThemedText>
        <ThemedText style={styles.cardValue}>{delivery.details.receiver} ({delivery.details.receiverPhone})</ThemedText>
        <ThemedText style={styles.cardTitle}>Instructions</ThemedText>
        <ThemedText style={styles.cardValue}>{delivery.details.instructions}</ThemedText>
        <ThemedText style={styles.cardTitle}>Package Size</ThemedText>
        <ThemedText style={styles.cardValue}>{delivery.details.packageSize}</ThemedText>
        <ThemedText style={styles.cardTitle}>Options</ThemedText>
        <ThemedText style={styles.cardValue}>{delivery.details.options}</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },
  card: {
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
    color: "#888",
  },
  cardValue: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
});
