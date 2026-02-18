export type VendorStatus =
  | "PENDING"
  | "APPROVED"
  | "SUSPENDED"
  | "BANNED"
  | "CLOSED_PERMANENTLY"
  | "ACTIVE";

export interface ProfileData {
  storeBanner?: string;
  profilePicture?: string;
  businessName: string;
  shopName: string;
  status: VendorStatus;
}
