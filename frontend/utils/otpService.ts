import { api } from "./api";

export async function callSendOtp(email: string): Promise<void> {
  try {
    await api.post("/api/auth/send-otp", {
      email: email.trim().toLowerCase(),
    });
  } catch (err: any) {
    if (err.message && (err.message.includes("Network request failed") || err.message.includes("Failed to fetch"))) {
      throw { code: "network-error", message: "Could not connect to the backend server. Is it running?" };
    }
    throw err;
  }
}

export async function callVerifyOtp(email: string, otp: string): Promise<boolean> {
  try {
    await api.post("/api/auth/verify-otp", {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
    });
    return true;
  } catch (err: any) {
    if (err.message && (err.message.includes("Network request failed") || err.message.includes("Failed to fetch"))) {
      throw { code: "network-error", message: "Could not connect to the backend server." };
    }
    throw err;
  }
}
