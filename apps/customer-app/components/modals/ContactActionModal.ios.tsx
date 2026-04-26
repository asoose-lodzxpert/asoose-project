import React, { useEffect } from "react";
import { ActionSheetIOS, View } from "react-native";
import { ContactActionModalProps } from "./ContactActionModal.types";

// iOS — uses native ActionSheetIOS. No visual chrome needed.
export default function ContactActionModal({
  visible,
  contact,
  onClose,
  onEdit,
  onDelete,
}: ContactActionModalProps) {
  useEffect(() => {
    if (!visible || !contact) return;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: contact.name,
        message: contact.phone,
        options: ["Edit Contact", "Delete Contact", "Close"],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          onEdit();
        } else if (buttonIndex === 1) {
          onDelete();
        } else {
          onClose();
        }
      }
    );
  }, [visible, contact]);

  // No UI rendered — ActionSheetIOS is imperative
  return <View />;
}
