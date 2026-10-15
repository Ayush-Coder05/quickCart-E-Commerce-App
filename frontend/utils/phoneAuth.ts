/**
 * utils/phoneAuth.ts
 *
 * Phone OTP verification utility.
 */

let _storedPhone: string | null = null;

export async function sendOtp(
  phone: string,
  recaptchaVerifier?: any,
): Promise<void> {
  _storedPhone = phone;
}

export async function confirmOtp(otp: string): Promise<boolean> {
  // Demo OTP verification
  return otp.trim() === "123456";
}

export function clearOtpSession(): void {
  _storedPhone = null;
}
