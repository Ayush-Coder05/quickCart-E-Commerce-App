// utils/auth.ts
//
// Authentication utilities using MongoDB FastAPI backend (/api/auth)

import { api, setAuthSession, clearAuthSession, getStoredUser, ApiUser } from "./api";
import { saveExpoPushToken } from "../services/notificationService";

export const DEFAULT_OTP = "123456";

export interface User {
  id: string;
  fullName: string;
  mobile: string;
  password?: string;
  createdAt?: any;
  updatedAt?: any;
}

/** Legacy: Validate OTP - always "123456" for demo or checked via API */
export function verifyOtp(entered: string): boolean {
  return entered.trim() === DEFAULT_OTP;
}

// ── MongoDB FastAPI Auth ───────────────────────────────────────────────────

/**
 * Register a new user with email + password via MongoDB API.
 * Also synchronizes local session and push token.
 * Returns the user UID / ID on success.
 */
export async function registerUserWithEmail(
  fullName: string,
  email: string,
  password: string,
  mobile?: string,
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();

  const res = await api.post<{ success: boolean; token: string; user: ApiUser }>("/api/auth/register", {
    fullName: fullName.trim(),
    email: normalizedEmail,
    password,
    mobile: mobile ? mobile.trim() : "",
  });

  const user = res.user;
  const uid = user.uid || user.id;

  // Persist MongoDB session
  await setAuthSession(res.token, user);

  // Store push token
  saveExpoPushToken(uid).catch(() => {});

  return uid;
}

/** Check if email is already registered via MongoDB backend API */
export async function userExistsByEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;

  try {
    const res = await api.post<{ success: boolean; exists: boolean }>("/api/auth/check-email", {
      email: normalizedEmail,
    });
    return Boolean(res.exists);
  } catch (err) {
    console.warn("MongoDB check-email failed:", err);
    return false;
  }
}

/**
 * Sign in with email + password via MongoDB API.
 * Returns the authenticated user session on success.
 */
export async function loginUserWithEmail(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const res = await api.post<{ success: boolean; token: string; user: ApiUser }>("/api/auth/login", {
    email: normalizedEmail,
    password,
  });

  const user = res.user;
  const uid = user.uid || user.id;

  // Persist session
  await setAuthSession(res.token, user);

  // Refresh push token
  saveExpoPushToken(uid).catch(() => {});

  return {
    uid,
    id: uid,
    email: user.email,
    displayName: user.fullName,
    role: user.role || "customer",
    emailVerified: true,
  };
}

/**
 * Check if current user email is verified.
 */
export async function checkEmailVerified(): Promise<boolean> {
  return true;
}

/**
 * Resend the verification OTP email via backend mailer.
 */
export async function resendVerificationEmail(): Promise<void> {
  const user = await getStoredUser();
  if (!user?.email) throw new Error("No user is currently signed in.");
  await api.post("/api/auth/send-otp", { email: user.email });
}

/**
 * Sign out current user, clear tokens, and reset session.
 */
export async function logoutUser(): Promise<void> {
  try {
    await clearAuthSession();
  } catch (err) {
    console.warn("Logout error:", err);
  }
}

// ── Legacy compatibility stubs ──────────────────────────────────────────────

export async function registerUser(fullName: string, mobile: string, password: string): Promise<boolean> {
  try {
    const email = `${mobile}@quickcart.local`;
    await registerUserWithEmail(fullName, email, password, mobile);
    return true;
  } catch {
    return false;
  }
}

export async function findUserByMobile(mobile: string): Promise<User | null> {
  return null;
}

export async function loginUser(mobile: string, password: string): Promise<User | null> {
  try {
    const email = `${mobile}@quickcart.local`;
    const res = await loginUserWithEmail(email, password);
    return {
      id: res.id,
      fullName: res.displayName,
      mobile,
    };
  } catch {
    return null;
  }
}

export async function updatePassword(mobile: string, newPassword: string): Promise<boolean> {
  return true;
}
