import Constants from "expo-constants";

const configuredOtpUrl =
  process.env.EXPO_PUBLIC_OTP_URL ||
  (Constants.expoConfig?.extra?.otpUrl as string | undefined);
const OTP_SERVER_URL = (configuredOtpUrl || "http://10.0.2.2:3000").replace(/\/$/, "");

async function parseResponse(response: Response): Promise<Record<string, any>> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function callSendOtp(email: string): Promise<void> {
  try {
    const res = await fetch(`${OTP_SERVER_URL}/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const data = await parseResponse(res);
    if (!res.ok || data.success === false) {
      throw { code: data.code || "unknown", message: data.message || "Failed to send OTP" };
    }
  } catch (err: any) {
    if (err.message && err.message.includes("Network request failed")) {
      throw { code: "network-error", message: "Could not connect to the OTP server. Is it running?" };
    }
    throw err;
  }
}

export async function callVerifyOtp(email: string, otp: string): Promise<boolean> {
  try {
    const res = await fetch(`${OTP_SERVER_URL}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
    });

    const data = await parseResponse(res);
    if (!res.ok || data.success === false) {
      throw { code: data.code || "unknown", message: data.message || "Verification failed" };
    }
    return true;
  } catch (err: any) {
    if (err.message && err.message.includes("Network request failed")) {
      throw { code: "network-error", message: "Could not connect to the OTP server." };
    }
    throw err;
  }
}

