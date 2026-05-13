import React from "react";
import { StyleSheet, View } from "react-native";

import { useJobs } from "@/context/JobContext";

import AtPickupScreen from "./AtPickupScreen";
import ConfirmJobScreen from "./ConfirmJobScreen";
import EnRouteToDropoff from "./EnRouteToDropoff";
import EnRouteToPickup from "./EnRouteToPickup";
import IncomingOrderSheet from "./IncomingOrderSheet";
import OfflineScreen from "./OfflineScreen";
import OnlineWaitingScreen from "./OnlineWaitingScreen";
import PaymentPendingScreen from "./PaymentPendingScreen";

type Props = {
  onAnimateToPickup?: () => void;
  onAnimateToDropoff?: () => void;
};

export default function BottomOverlay({
  onAnimateToPickup,
  onAnimateToDropoff,
}: Props) {
  const { status, activeJob, incomingJob } = useJobs();

  return (
    <View style={styles.container} pointerEvents="box-none">
      {status === "offline" && <OfflineScreen />}

      {status === "online-waiting" && <OnlineWaitingScreen />}

      {status === "incoming-job" && incomingJob && <IncomingOrderSheet />}

      {status === "en-route-pickup" && activeJob && (
        <EnRouteToPickup onAnimateToPickup={onAnimateToPickup} />
      )}

      {status === "at-pickup" && activeJob && <AtPickupScreen />}

      {status === "en-route-dropoff" && activeJob && (
        <EnRouteToDropoff onAnimateToDropoff={onAnimateToDropoff} />
      )}

      {status === "confirm-job" && activeJob && <ConfirmJobScreen />}

      {status === "payment-pending" && activeJob && <PaymentPendingScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "flex-end",
  },
});
