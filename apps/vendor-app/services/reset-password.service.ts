export async function sendVendorOtp(email: string) {
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/send-otp`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }
  );
  if (!res.ok) throw new Error("Failed to send OTP");
  return true;
}

export async function verifyVendorOtp(email: string, otp: string) {
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/verify-otp`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    }
  );
  if (!res.ok) throw new Error("Invalid OTP");
  return true;
}

export async function resetVendorPassword(
  email: string,
  otp: string,
  newPassword: string
) {
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/reset-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    }
  );
  if (!res.ok) throw new Error("Failed to reset password");
  return true;
}
