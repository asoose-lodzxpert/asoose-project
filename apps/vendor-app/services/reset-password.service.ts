import { fetchWithAuth } from "./auth-fetch";

// ---------- FOR FORGOT PASSWORD (NON-AUTHENTICATED) ----------

export async function sendVendorOtp(email: string) {
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/send-otp`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    },
  );
  if (!res.ok) throw new Error("Failed to send OTP");
  return true;
}

export async function verifyVendorOtp(email: string, otp: string) {
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/verify-otp`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    },
  );
  if (!res.ok) throw new Error("Invalid OTP");
  return true;
}

export async function resetVendorPassword(
  email: string,
  otp: string,
  newPassword: string,
) {
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/reset-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp, newPassword }),
    },
  );
  if (!res.ok) throw new Error("Failed to reset password");
  return true;
}

// ---------- FOR AUTHENTICATED USER CHANGE PASSWORD ----------

export async function sendChangePasswordOtp() {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/send-change-password-otp`,
    {
      method: "POST",
    },
  );
}

export async function verifyChangePasswordOtp(otp: string) {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/verify-change-password-otp`,
    {
      method: "POST",
      body: JSON.stringify({ otp }),
    },
  );
}

export async function changePassword(otp: string, newPassword: string) {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/change-password`,
    {
      method: "POST",
      body: JSON.stringify({ otp, newPassword }),
    },
  );
}
