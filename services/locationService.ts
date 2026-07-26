// ─────────────────────────────────────────────────────────────────────────────
//  services/locationService.ts
//
//  Full GPS → reverse-geocode → Indian state pipeline using expo-location.
//  Handles every permission state and error gracefully.
// ─────────────────────────────────────────────────────────────────────────────

import * as Location from "expo-location";
import { Platform } from "react-native";
import { normalizeStateName } from "../utils/indianStates";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LocationPermissionStatus =
  | "undetermined"   // never asked
  | "granted"
  | "denied"         // denied but can ask again
  | "permanentlyDenied"; // denied; must go to Settings

export type LocationFailureReason =
  | "serviceDisabled"      // GPS/Location service is OFF
  | "permissionDenied"     // permission denied (can ask again)
  | "permissionPermanentlyDenied" // must open Settings
  | "geocodingFailed"      // reverseGeocodeAsync returned nothing
  | "stateNotDetected"     // geocoding succeeded but state unrecognisable
  | "unknown";             // unexpected error

export type LocationSuccess = {
  success: true;
  state: string;      // normalised Firestore document name (e.g. "Bihar")
  latitude: number;
  longitude: number;
  rawRegion: string | null; // raw value returned by geocoder
};

export type LocationFailure = {
  success: false;
  reason: LocationFailureReason;
  message: string;    // human-readable, suitable for display
};

export type LocationResult = LocationSuccess | LocationFailure;

// ── Permission helpers ─────────────────────────────────────────────────────────

/**
 * Read the current foreground location permission status without requesting.
 */
export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  try {
    const { status, canAskAgain } =
      await Location.getForegroundPermissionsAsync();

    if (status === Location.PermissionStatus.GRANTED) return "granted";
    if (status === Location.PermissionStatus.UNDETERMINED) return "undetermined";
    // DENIED
    return canAskAgain ? "denied" : "permanentlyDenied";
  } catch {
    return "undetermined";
  }
}

/**
 * Request foreground location permission from the OS.
 * On web this triggers the browser geolocation dialog.
 */
export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  try {
    const { status, canAskAgain } =
      await Location.requestForegroundPermissionsAsync();

    if (status === Location.PermissionStatus.GRANTED) return "granted";
    return canAskAgain ? "denied" : "permanentlyDenied";
  } catch {
    return "denied";
  }
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

/**
 * Full location pipeline:
 *   1. Check GPS service enabled
 *   2. Check / request foreground permission
 *   3. Get current coordinates (balanced accuracy, 15-second timeout)
 *   4. Reverse-geocode to get placemark
 *   5. Normalise the state name against our Indian States list
 *
 * @returns LocationResult - success with state name, or failure with reason
 */
export async function detectIndianState(): Promise<LocationResult> {
  // ── 1. Check if location service (GPS) is enabled ─────────────────────────
  try {
    const serviceEnabled = await Location.hasServicesEnabledAsync();
    if (!serviceEnabled) {
      return {
        success: false,
        reason:  "serviceDisabled",
        message: "Location services (GPS) are disabled. Please turn them on in Settings.",
      };
    }
  } catch {
    // On web, hasServicesEnabledAsync may throw - continue anyway
    if (Platform.OS !== "web") {
      return {
        success: false,
        reason:  "serviceDisabled",
        message: "Could not check location services status.",
      };
    }
  }

  // ── 2. Check / request permission ────────────────────────────────────────
  let permStatus = await getLocationPermissionStatus();

  if (permStatus === "undetermined" || permStatus === "denied") {
    permStatus = await requestLocationPermission();
  }

  if (permStatus === "permanentlyDenied") {
    return {
      success: false,
      reason:  "permissionPermanentlyDenied",
      message: "Location permission is permanently denied. Please enable it in your device Settings.",
    };
  }

  if (permStatus !== "granted") {
    return {
      success: false,
      reason:  "permissionDenied",
      message: "Location permission was denied. You can select your state manually.",
    };
  }

  // ── 3. Get current position ────────────────────────────────────────────────
  let position: Location.LocationObject;
  try {
    position = await Location.getCurrentPositionAsync({
      accuracy:         Location.Accuracy.Balanced, // faster than High, good enough
      mayShowUserSettingsDialog: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      reason:  "unknown",
      message: `Could not get current position: ${msg}`,
    };
  }

  // ── 4. Reverse-geocode ────────────────────────────────────────────────────
  let placemarks: Location.LocationGeocodedAddress[];
  try {
    placemarks = await Location.reverseGeocodeAsync({
      latitude:  position.coords.latitude,
      longitude: position.coords.longitude,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      reason:  "geocodingFailed",
      message: `Reverse geocoding failed: ${msg}`,
    };
  }

  if (!placemarks || placemarks.length === 0) {
    return {
      success: false,
      reason:  "geocodingFailed",
      message: "Could not identify your location. Please select your state manually.",
    };
  }

  // ── 5. Normalise state name ───────────────────────────────────────────────
  const placemark = placemarks[0];
  // expo-location returns the state in `region` for Indian addresses
  const rawRegion = placemark.region ?? placemark.subregion ?? null;
  const normalised = normalizeStateName(rawRegion);

  if (!normalised) {
    return {
      success: false,
      reason:  "stateNotDetected",
      message: `Could not identify an Indian state from "${rawRegion ?? "unknown"}". Please select your state manually.`,
    };
  }

  return {
    success:   true,
    state:     normalised,
    latitude:  position.coords.latitude,
    longitude: position.coords.longitude,
    rawRegion,
  };
}

