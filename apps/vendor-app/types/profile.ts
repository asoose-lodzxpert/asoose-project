export type VendorStatus = "pending" | "approved" | "suspended";

export interface ProfileData {
  profilePicture?: string;
  businessName: string;
  shopName: string;
  status: VendorStatus;
}
