// ─────────────────────────────────────────────────────────────────────────────
//  services/notificationService.ts
//
//  Notification permission management using expo-notifications.
//  - Requests permission after successful login
//  - Sets up Android notification channel for FCM
//  - Gracefully handles denied / simulator / web / Expo Go environments
//
//  ⚠️  SDK 53 removed Android push token support from Expo Go.
//      We detect Expo Go at runtime and skip ALL push-related code so the
//      app can still be tested there without crashing. Push tokens work
//      normally in a development build or production build.
// ─────────────────────────────────────────────────────────────────────────────

import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Expo Go detection ─────────────────────────────────────────────────────────
// `appOwnership === "expo"` → running inside Expo Go
// All other values (null / "standalone" / "guest") → dev build or production
const IS_EXPO_GO = Constants.appOwnership === "expo";

// ── Lazily initialise expo-notifications ─────────────────────────────────────
// Importing the module at the top level causes Expo Go to crash on SDK 53+
// because it tries to register a push-token listener on import.
// We import it conditionally so the crash never happens in Expo Go.
let Notifications: typeof import("expo-notifications") | null = null;

if (!IS_EXPO_GO) {
  // Dynamic require keeps the module out of the Expo Go bundle evaluation path
  Notifications = require("expo-notifications") as typeof import("expo-notifications");

  // Configure foreground notification behaviour only when the module is available
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert:  true,
      shouldPlaySound:  true,
      shouldSetBadge:   false,
      shouldShowBanner: true,
      shouldShowList:   true,
    }),
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined"
  | "unavailable"; // web, simulator, or Expo Go

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Read the current notification permission status without prompting. */
export async function getNotificationStatus(): Promise<NotificationPermissionStatus> {
  // Push notifications are not supported on web or Expo Go
  if (Platform.OS === "web" || IS_EXPO_GO || !Notifications) return "unavailable";

  try {
    const { status } = await Notifications.getPermissionsAsync();
    switch (status) {
      case "granted": return "granted";
      case "denied":  return "denied";
      default:        return "undetermined";
    }
  } catch {
    return "unavailable";
  }
}

/**
 * Request notification permission from the user.
 *
 * - On Android 13+ (API 33+) this triggers the OS permission dialog.
 * - On Android < 13 notifications are granted by default; we still set up
 *   the notification channel so FCM messages display correctly.
 * - Silently returns "unavailable" in Expo Go (SDK 53+) to avoid crashing.
 * - Always resolves (never throws) - denial is a valid, handled outcome.
 *
 * @returns The resulting permission status
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === "web" || IS_EXPO_GO || !Notifications) return "unavailable";

  try {
    // ── Android: set up notification channel first ─────────────────────────
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("quickcart-default", {
        name:             "quickCart Notifications",
        description:      "General alerts, deals, and order updates.",
        importance:       Notifications.AndroidImportance?.HIGH ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor:       "#F97316", // quickCart orange
        showBadge:        true,
      });
    }

    // ── Request OS permission ──────────────────────────────────────────────
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    let finalStatus: NotificationPermissionStatus = "undetermined";
    switch (status) {
      case "granted": finalStatus = "granted"; break;
      case "denied":  finalStatus = "denied";  break;
    }

    try {
      await AsyncStorage.setItem("@quickcart_notif_status", finalStatus);
    } catch (e) {
      console.log("Failed to save notif status:", e);
    }

    return finalStatus;
  } catch {
    // Non-critical - log but do not block the user
    return "unavailable";
  }
}

/**
 * Attempt to get the Expo push token for FCM delivery.
 * Returns null on simulators, web, Expo Go, or if permission is denied.
 *
 * Note: A real FCM token requires a physical device and Firebase project
 * configuration. Store this token in Firestore against the user's UID
 * to enable server-side push targeting.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web" || IS_EXPO_GO || !Notifications) return null;

  try {
    const status = await getNotificationStatus();
    if (status !== "granted") return null;

    const { data } = await Notifications.getExpoPushTokenAsync({
      projectId: (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) || "bde50b43-91f0-4967-b5b8-b8ad12839883",
    });
    return data;
  } catch {
    // Fails on simulator - expected, not an error
    return null;
  }
}



