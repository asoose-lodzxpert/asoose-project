import {
  Modal,
  Pressable,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

const CANCEL_REASONS = [
  "Changed my mind",
  "Driver is taking too long",
  "Wrong location entered",
  "Found another ride",
  "Booked by mistake",
  "Emergency came up",
  "Other (specify below)",
];

type CancelRideModalProps = {
  visible: boolean;
  selectedReason: string | null;
  customReason: string;
  cancelling: boolean;
  onClose: () => void;
  onSelectReason: (reason: string) => void;
  onChangeCustom: (text: string) => void;
  onConfirm: () => void;
};

export default function CancelRideModal({
  visible,
  selectedReason,
  customReason,
  cancelling,
  onClose,
  onSelectReason,
  onChangeCustom,
  onConfirm,
}: CancelRideModalProps) {
  const isOther = selectedReason === "Other (specify below)";
  const canConfirm =
    !!selectedReason && (!isOther || customReason.trim().length > 0);

  const primaryColor = useThemeColor({}, "brandPrimary");
  const dangerColor = useThemeColor({}, "statusError");
  const surfaceColor = useThemeColor({}, "surfaceBackground");
  const cardColor = useThemeColor({}, "surfaceCard");
  const borderColor = useThemeColor({}, "borderDefault");
  const textPrimary = useThemeColor({}, "textPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.cancelSheetWrap}
      >
        <View style={[styles.cancelSheet, { backgroundColor: surfaceColor }]}>
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: borderColor }]} />
          </View>

          {/* Title */}
          <ThemedText
            type="defaultSemiBold"
            style={[styles.cancelSheetTitle, { color: textPrimary }]}
          >
            Cancel Ride
          </ThemedText>

          <ThemedText
            type="caption"
            style={[styles.cancelSheetSub, { color: textSecondary }]}
          >
            Please let us know why you're cancelling
          </ThemedText>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 340 }}
            keyboardShouldPersistTaps="handled"
          >
            {CANCEL_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <Pressable
                  key={reason}
                  onPress={() => onSelectReason(reason)}
                  style={[
                    styles.reasonRow,
                    {
                      borderColor: isSelected ? primaryColor : borderColor,
                      backgroundColor: isSelected
                        ? primaryColor + "10"
                        : "transparent",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      { borderColor: isSelected ? primaryColor : borderColor },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.radioInner,
                          { backgroundColor: primaryColor },
                        ]}
                      />
                    )}
                  </View>
                  <ThemedText
                    style={[
                      styles.reasonText,
                      { color: isSelected ? primaryColor : textPrimary },
                    ]}
                  >
                    {reason}
                  </ThemedText>
                </Pressable>
              );
            })}

            {isOther && (
              <View
                style={[
                  styles.customInputWrap,
                  { borderColor: primaryColor, backgroundColor: cardColor },
                ]}
              >
                <TextInput
                  value={customReason}
                  onChangeText={onChangeCustom}
                  placeholder="Tell us what happened…"
                  placeholderTextColor={textSecondary}
                  style={[styles.customInput, { color: textPrimary }]}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                  autoFocus
                />
                <ThemedText
                  type="caption"
                  style={{
                    color: textSecondary,
                    textAlign: "right",
                    paddingRight: 4,
                    paddingBottom: 4,
                  }}
                >
                  {customReason.length}/200
                </ThemedText>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.cancelSheetActions}>
            <Pressable
              onPress={onClose}
              style={[
                styles.actionBtn,
                {
                  borderColor: borderColor,
                  borderWidth: 1,
                  backgroundColor: cardColor,
                },
              ]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: textPrimary }}>
                Keep Ride
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={!canConfirm || cancelling}
              style={[
                styles.actionBtn,
                {
                  backgroundColor:
                    !canConfirm || cancelling
                      ? dangerColor + "50"
                      : dangerColor,
                },
              ]}
            >
              {cancelling ? (
                // You could add <ActivityIndicator /> here if you want
                <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
                  Cancelling…
                </ThemedText>
              ) : (
                <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
                  Cancel Ride
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  cancelSheetWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  cancelSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  cancelSheetTitle: {
    fontSize: 18,
    marginBottom: 4,
    textAlign: "center",
  },
  cancelSheetSub: {
    textAlign: "center",
    marginBottom: 16,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  reasonText: {
    fontSize: 14,
    flex: 1,
  },
  customInputWrap: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 8,
  },
  customInput: {
    fontSize: 14,
    minHeight: 72,
    lineHeight: 20,
  },
  cancelSheetActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
});
