import { RideContact } from "@/services/ride-contact.service";

// Shared prop types for ContactPickerModal platform variants
export interface ContactPickerModalProps {
  visible: boolean;
  contacts: RideContact[];
  loading: boolean;
  onClose: () => void;
  onSelect: (contact: RideContact) => void;
  onAddNew: () => void;
  onMenuPress: (contact: RideContact) => void;
}
