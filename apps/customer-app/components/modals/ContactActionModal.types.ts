import { RideContact } from "@/services/ride-contact.service";

// Shared prop types for ContactActionModal platform variants
export interface ContactActionModalProps {
  visible: boolean;
  contact: RideContact | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
