import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { db, auth } from "./firebase";
import { saveExpoPushToken } from "../services/notificationService";

export const DEFAULT_OTP = "123456";

export interface User {
  id: string;
  fullName: string;
  mobile: string;
  password: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

const usersCollection = collection(db, "users");
const FIRESTORE_TIMEOUT_MS = 15000;

export class AuthRequestTimeoutError extends Error {
  constructor() {
    super("Firestore request timed out. Check your internet connection and Firestore rules.");
    this.name = "AuthRequestTimeoutError";
  }
}

async function withTimeout<T>(request: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new AuthRequestTimeoutError()), FIRESTORE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function mapUser(id: string, data: Record<string, unknown>): User {
  return {
    id,
    fullName: String(data.fullName ?? ""),
    mobile: String(data.mobile ?? ""),
    password: String(data.password ?? ""),
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
  };
}

// ── Legacy Firestore-based auth (kept for backward compat) ────────────────────

/** Legacy: Register a new user by mobile. Returns false if mobile already exists. */
export async function registerUser(
  fullName: string,
  mobile: string,
  password: string,
): Promise<boolean> {
  const existingUser = await findUserByMobile(mobile);
  if (existingUser) return false;

  await withTimeout(
    addDoc(usersCollection, {
      fullName,
      mobile,
      password,
      createdAt: Timestamp.now(),
    }),
  );

  return true;
}

/** Legacy: Find a user by mobile number. */
export async function findUserByMobile(mobile: string): Promise<User | null> {
  const snapshot = await withTimeout(
    getDocs(query(usersCollection, where("mobile", "==", mobile), limit(1))),
  );
  const userDoc = snapshot.docs[0];
  return userDoc ? mapUser(userDoc.id, userDoc.data()) : null;
}

/** Legacy: Validate login credentials by mobile + password. */
export async function loginUser(mobile: string, password: string): Promise<User | null> {
  const user = await findUserByMobile(mobile);
  if (!user || user.password !== password) return null;
  return user;
}

/** Update the password for an existing user. Returns false if not found. */
export async function updatePassword(mobile: string, newPassword: string): Promise<boolean> {
  const user = await findUserByMobile(mobile);
  if (!user) return false;

  await withTimeout(
    updateDoc(doc(db, "users", user.id), {
      password: newPassword,
      updatedAt: Timestamp.now(),
    }),
  );

  return true;
}

/** Legacy: Validate OTP - always "123456" for this demo. */
export function verifyOtp(entered: string): boolean {
  return entered.trim() === DEFAULT_OTP;
}

// ── Firebase Auth (Email-based) ───────────────────────────────────────────────

/**
 * Register a new user with email + password via Firebase Auth.
 * Also saves profile data (name, optional mobile) to Firestore users/{uid}.
 * Sends a Firebase verification email - no credentials stored in the app.
 * Returns the Firebase Auth UID on success.
 */
export async function registerUserWithEmail(
  fullName: string,
  email: string,
  password: string,
  mobile?: string,
): Promise<string> {
  // Create Firebase Auth account
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const uid = credential.user.uid;

  // Save profile to Firestore (no password stored here)
  await setDoc(doc(db, "users", uid), {
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    mobile: mobile ? mobile.trim() : "",
    createdAt: Timestamp.now(),
  });

  // Firebase sends the verification email from its own servers - no app password needed
  await sendEmailVerification(credential.user);

  // Store push token so this device can receive order/admin notifications
  saveExpoPushToken(uid).catch(() => {}); // fire-and-forget, non-blocking

  return uid;
}

/** Check Firebase Auth first; Firestore fallback is best-effort because signup runs before auth. */
export async function userExistsByEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;

  const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail).catch(() => []);
  if (methods.length > 0) return true;

  try {
    const exactSnap = await withTimeout(
      getDocs(query(usersCollection, where("email", "==", normalizedEmail), limit(1))),
    );
    if (!exactSnap.empty) return true;

    const legacySnap = await withTimeout(
      getDocs(query(usersCollection, where("email", "==", email.trim()), limit(1))),
    );
    return !legacySnap.empty;
  } catch (error: any) {
    const code = String(error?.code || error?.message || "").toLowerCase();
    if (code.includes("permission-denied") || code.includes("insufficient permissions")) {
      console.warn("Skipping Firestore duplicate-email fallback before signup because rules denied unauthenticated lookup.");
      return false;
    }
    throw error;
  }
}

/**
 * Sign in with email + password via Firebase Auth.
 * Returns the Firebase user on success, throws on failure.
 * Also refreshes the stored push token (token can rotate after reinstall).
 */
export async function loginUserWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  // Refresh push token on every login (token can rotate after reinstall)
  saveExpoPushToken(credential.user.uid).catch(() => {});
  return credential.user;
}

/**
 * Reload the current user and check if their email is verified.
 * Must be called after user clicks the verification link in their email.
 */
export async function checkEmailVerified(): Promise<boolean> {
  if (!auth.currentUser) return false;
  await reload(auth.currentUser);
  return auth.currentUser.emailVerified;
}

/**
 * Resend the verification email to the currently signed-in (unverified) user.
 * Firebase enforces rate limiting automatically.
 */
export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) throw new Error("No user is currently signed in.");
  await sendEmailVerification(auth.currentUser);
}

/**
 * Sign out the current Firebase Auth user and clear local stores.
 * Call this on logout, not just stateStore.clear().
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Silently ignore sign-out errors (e.g. already signed out)
  }
}
