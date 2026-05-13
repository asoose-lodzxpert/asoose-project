// Shared prop types for the WhoIsRidingModal
export interface WhoIsRidingModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSelf: () => void;
  onSelectOther: (name?: string, phone?: string) => void;
}
