export type VendorStatus = "PENDING" | "APPROVED" | "SUSPENDED";

export interface ProfileData {
  profilePicture?: string;
  businessName: string;
  shopName: string;
  status: VendorStatus;
}
