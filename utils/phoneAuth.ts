/**
 * utils/phoneAuth.ts
 *
 * Firebase Phone Authentication - sends a real SMS OTP to the user's mobile.
 *
 * Flow:
 *   1. Call sendOtp(phoneNumber, recaptchaToken) → stores confirmationResult
 *   2. User enters the OTP received on their phone
 *   3. Call verifyOtp(otp) → returns true/false
 *
 * On Expo Go / Web: uses reCAPTCHA (invisible) via expo-firebase-recaptcha.
 * On a production native build: add SHA-1 fingerprint to Firebase console
 * and enable Play Integrity / SafetyNet for silent verification.
 */

import {
  ConfirmationResult,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { auth } from "./firebase";

// Module-level confirmation result - set after sendOtp() succeeds
let _confirmationResult: ConfirmationResult | null = null;

/**
 * Send a real SMS OTP to the given Indian mobile number (+91 XXXXXXXXXX).
 *
 * @param phone       10-digit number (no country code)
 * @param recaptchaVerifier  FirebaseRecaptchaVerifierModal ref (from expo-firebase-recaptcha)
 */
export async function sendOtp(
  phone: string,
  recaptchaVerifier: RecaptchaVerifier,
): Promise<void> {
  const e164 = `+91${phone.replace(/\D/g, "")}`;
  _confirmationResult = await signInWithPhoneNumber(auth, e164, recaptchaVerifier);
}

/**
 * Confirm the OTP the user typed.
 * Returns true on success, false if the OTP is wrong.
 * Throws if sendOtp() was never called.
 */
export async function confirmOtp(otp: string): Promise<boolean> {
  if (!_confirmationResult) {
    throw new Error("Call sendOtp() before confirmOtp().");
  }
  try {
    await _confirmationResult.confirm(otp.trim());
    _confirmationResult = null; // clear after successful use
    return true;
  } catch {
    return false;
  }
}

/** Clear stored confirmation result (e.g. when phone number changes). */
export function clearOtpSession(): void {
  _confirmationResult = null;
}

