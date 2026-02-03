export type VendorStatus = "PENDING" | "APPROVED" | "SUSPENDED";

export interface ProfileData {
  storeBanner?: string;
  profilePicture?: string;
  businessName: string;
  shopName: string;
  status: VendorStatus;
}
