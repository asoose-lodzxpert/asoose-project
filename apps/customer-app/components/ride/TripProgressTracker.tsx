import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { RideStatus } from "@/types/ride";

type StatusStep = {
  status: RideStatus;
  label: string;
  icon: string;
};

const STATUS_STEPS: StatusStep[] = [
  { status: RideStatus.REQUESTED, label: "Requested", icon: "checkmark.circle" },
  { status: RideStatus.ACCEPTED, label: "Driver Found", icon: "person.fill" },
  { status: RideStatus.ARRIVED, label: "Driver Arrived", icon: "location.fill" },
  { status: RideStatus.IN_PROGRESS, label: "In Progress", icon: "car.fill" },
  { status: RideStatus.COMPLETED, label: "Completed", icon: "checkmark.circle.fill" },
];

type Props = {
  currentStatus: RideStatus;
};

export function TripProgressTracker({ currentStatus }: Props) {
  const primary = useThemeColor({}, "brandPrimary");
  const success = useThemeColor({}, "statusSuccess");
  const textSecondary = useThemeColor({}, "textSecondary");
  const border = useThemeColor({}, "borderDefault");

  const getCurrentIndex = () => {
    return STATUS_STEPS.findIndex((step) => step.status === currentStatus);
  };

  const currentIndex = getCurrentIndex();

  return (
    <View style={styles.container}>
      {STATUS_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isActive = isCompleted || isCurrent;

        return (
          <View key={step.status} style={styles.stepContainer}>
            <View style={styles.stepContent}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isActive ? primary : border,
                  },
                ]}
              >
                <IconSymbol
                  name={step.icon as any}
                  size={16}
                  color={isActive ? "white" : textSecondary}
                />
              </View>

              <ThemedText
                type="caption"
                style={[
                  styles.label,
                  {
                    color: isActive ? primary : textSecondary,
                    fontWeight: isCurrent ? "600" : "400",
                  },
                ]}
              >
                {step.label}
              </ThemedText>
            </View>

            {index < STATUS_STEPS.length - 1 && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor: isCompleted ? primary : border,
                  },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  stepContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  stepContent: {
    alignItems: "center",
    gap: 4,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 4,
  },
  connector: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
});
