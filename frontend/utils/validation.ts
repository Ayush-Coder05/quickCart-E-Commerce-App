export interface AuthErrors {
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  password?: string;
  confirmPassword?: string;
  otp?: string;
  emailOtp?: string;
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function validateName(name: string) {
  if (!name.trim()) return "Enter your full name.";
  if (name.trim().length < 2) return "Name must be at least 2 characters.";
  return "";
}

export function validateEmail(email: string) {
  if (!email.trim()) return "Enter your email address.";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return "Enter a valid email address.";
  return "";
}

/**
 * Mobile is optional - only validates if a value is entered.
 * Returns "" (no error) when the field is left blank.
 */
export function validateMobile(mobile: string) {
  if (!mobile.trim()) return ""; // optional field - no error if empty
  const normalized = normalizePhone(mobile);
  if (normalized.length !== 10) return "Enter a valid 10-digit mobile number.";
  return "";
}

export function validatePhone(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return "Enter your phone number.";
  if (normalized.length !== 10) return "Enter a valid 10-digit phone number.";
  return "";
}

export function validatePassword(password: string) {
  if (!password) return "Enter your password.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Use at least one letter and one number.";
  }
  return "";
}

export function validateConfirmPassword(password: string, confirmPassword: string) {
  if (!confirmPassword) return "Confirm your password.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return "";
}

export function validateOtp(otp: string) {
  if (!otp.trim()) return "Enter the reset code.";
  if (!/^\d{6}$/.test(otp.trim())) return "Reset code must be 6 digits.";
  return "";
}

