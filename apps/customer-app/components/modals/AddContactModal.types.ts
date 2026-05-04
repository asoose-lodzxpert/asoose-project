import { RideContact } from "@/services/ride-contact.service";

// Shared prop types for AddContactModal platform variants
export interface AddContactModalProps {
  visible: boolean;
  /** Existing contact — when provided the modal opens in edit mode */
  contact?: RideContact | null;
  onClose: () => void;
  /** Called with the final name, phone, and optional contactId (if saved) */
  onConfirm: (name: string, phone: string, contactId?: string) => void;
}
