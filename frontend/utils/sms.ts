/**
 * utils/sms.ts
 *
 * Sends a real OTP SMS to any Indian mobile number via Fast2SMS.
 *
 * Setup (one-time):
 *   1. Sign up free at https://www.fast2sms.com
 *   2. Go to Dev API → copy your API key
 *   3. Add it to your .env:  EXPO_PUBLIC_FAST2SMS_KEY=<your_key>
 *   4. Restart the Expo server
 *
 * The OTP value (DEFAULT_OTP = "123456") is always included in the message.
 * Verification is done locally - no round-trip needed.
 */

import { DEFAULT_OTP } from "./auth";

const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";
const API_KEY = process.env.EXPO_PUBLIC_FAST2SMS_KEY ?? "";

/**
 * Send a real SMS containing the demo OTP to the given 10-digit Indian number.
 * Throws on network error or API failure.
 */
export async function sendOtpSms(phone: string): Promise<void> {
  if (!API_KEY) {
    throw new Error(
      "Fast2SMS API key not set.\n" +
        "Add EXPO_PUBLIC_FAST2SMS_KEY=<your_key> to your .env file\n" +
        "and restart the Expo server.",
    );
  }

  const body = new URLSearchParams({
    route: "q",                                                          // Quick SMS - no DLT template needed for dev
    message: `Your quickCart OTP is ${DEFAULT_OTP}. Valid for 10 minutes. Do not share.`,
    numbers: phone,
    flash: "0",
  });

  const res = await fetch(FAST2SMS_URL, {
    method: "POST",
    headers: {
      authorization: API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
      "cache-control": "no-cache",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`SMS gateway error: HTTP ${res.status}`);
  }

  const json = (await res.json()) as { return: boolean; message?: string[] };

  if (!json.return) {
    throw new Error(json.message?.[0] ?? "SMS delivery failed. Check your Fast2SMS balance.");
  }
}

