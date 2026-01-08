import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { useDelivery } from "@/context/DeliveryContext";

import OfflineScreen from "./OfflineScreen";
import OnlineWaitingScreen from "./OnlineWaitingScreen";
import IncomingOrderSheet from "./IncomingOrderSheet";
import EnRouteToPickup from "./EnRouteToPickup";
import AtPickupScreen from "./AtPickupScreen";
import EnRouteToDropoff from "./EnRouteToDropoff";
import ConfirmDeliveryScreen from "./ConfirmDeliveryScreen";
import { deliveryService } from "@/services/deliveryService";

type Props = {
  onAnimateToPickup?: () => void;
  onAnimateToDropoff?: () => void;
};

export default function BottomOverlay({
  onAnimateToPickup,
  onAnimateToDropoff,
}: Props) {
  const {
    status,
    setStatus,
    activeDelivery,
    incomingOrder,
    arriveAtPickup,
    confirmPickup,
    arriveAtDropoff,
    completeDelivery,
    waitForOrder,
  } = useDelivery();

  useEffect(() => {
    if (status !== "online-waiting") return;

    waitForOrder();
  }, [status, setStatus]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {status === "offline" && <OfflineScreen />}

      {status === "online-waiting" && <OnlineWaitingScreen />}

      {status === "incoming-order" && incomingOrder && <IncomingOrderSheet />}

      {status === "en-route-pickup" && activeDelivery && (
        <EnRouteToPickup onAnimateToPickup={onAnimateToPickup} />
      )}

      {status === "at-pickup" && activeDelivery && <AtPickupScreen />}

      {status === "en-route-dropoff" && activeDelivery && <EnRouteToDropoff />}

      {status === "confirm-delivery" && activeDelivery && (
        <ConfirmDeliveryScreen />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "flex-end",
  },
});
