const API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Send OTP to rider's email for password reset
 */
export async function sendPasswordResetOtp(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/auth/rider/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to send OTP");
  }

  return response.json();
}

/**
 * Verify OTP for password reset
 */
export async function verifyResetOtp(email: string, otp: string): Promise<boolean> {
  const response = await fetch(`${API_URL}/auth/rider/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ email, otp }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Invalid OTP");
  }

  return response.json();
}

/**
 * Reset password with OTP
 */
export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string
): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/auth/rider/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ email, otp, newPassword }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to reset password");
  }

  return response.json();
}
