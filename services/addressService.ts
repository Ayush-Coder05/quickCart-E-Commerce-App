// ─────────────────────────────────────────────────────────────────────────────
//  services/addressService.ts
//
//  Delivery address management using expo-location and Firestore.
//  Schema: users/{uid}/addresses/{addressId}
//
//  Handles:
//   - GPS permission request + reverse geocoding (delegates to locationService)
//   - Partial geocoder results (city, state, postal code may be missing)
//   - Save / update / delete / set-default address operations
//   - All addresses stored in Firestore subcollection - no AsyncStorage
// ─────────────────────────────────────────────────────────────────────────────

import * as Location from "expo-location";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import {
  getLocationPermissionStatus,
  requestLocationPermission,
} from "./locationService";

// ── Address Fields ─────────────────────────────────────────────────────────────

export interface AddressFields {
  // Prefilled from GPS / reverse geocode
  city:       string;
  state:      string;
  postalCode: string;
  // User-entered details
  houseFlat:    string;
  streetArea:   string;
  landmark:     string;
  recipientName: string;
  phone:        string;
  label:        "Home" | "Work" | "Other";
  notes:        string;
  // Meta
  isDefault:  boolean;
}

export interface SavedAddress extends AddressFields {
  id:        string;
  uid:       string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── GPS + Geocode → Address Prefill ───────────────────────────────────────────

export type GeocodedPrefill = {
  success:    true;
  city:       string;
  state:      string;
  postalCode: string;
  latitude:   number;
  longitude:  number;
  isPartial:  boolean; // true if some fields could not be determined
};

export type GeocodedFailure = {
  success: false;
  reason:
    | "permissionDenied"
    | "permanentlyDenied"
    | "serviceDisabled"
    | "timeout"
    | "geocodingFailed"
    | "unknown";
  message: string;
};

export type GeocodedResult = GeocodedPrefill | GeocodedFailure;

/**
 * Request GPS permission (if not already granted), fetch current coordinates,
 * and reverse-geocode into address components usable for prefilling the form.
 *
 * Handles: undetermined / denied / permanently-denied / service-disabled /
 *          timeout / empty geocoder result / partial geocoder result.
 */
export async function getLocationForAddress(): Promise<GeocodedResult> {
  // ── 1. Check GPS service ──────────────────────────────────────────────────
  try {
    const serviceEnabled = await Location.hasServicesEnabledAsync();
    if (!serviceEnabled) {
      return {
        success: false,
        reason:  "serviceDisabled",
        message: "Location services (GPS) are disabled. Please enable them in Settings.",
      };
    }
  } catch {
    // hasServicesEnabledAsync may throw on web - continue
  }

  // ── 2. Permission ─────────────────────────────────────────────────────────
  let permStatus = await getLocationPermissionStatus();
  if (permStatus === "undetermined" || permStatus === "denied") {
    permStatus = await requestLocationPermission();
  }

  if (permStatus === "permanentlyDenied") {
    return {
      success: false,
      reason:  "permanentlyDenied",
      message: "Location permission is permanently denied. Enable it in device Settings, then tap 'Use Current Location' again.",
    };
  }
  if (permStatus !== "granted") {
    return {
      success: false,
      reason:  "permissionDenied",
      message: "Location permission was denied. Enter your address manually.",
    };
  }

  // ── 3. Get coordinates (15-second timeout) ────────────────────────────────
  let position: Location.LocationObject;
  try {
    const positionPromise = Location.getCurrentPositionAsync({
      accuracy:                  Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: true,
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 15000),
    );
    position = await Promise.race([positionPromise, timeoutPromise]);
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.message === "timeout";
    return {
      success: false,
      reason:  isTimeout ? "timeout" : "unknown",
      message: isTimeout
        ? "Location timed out. Please try again or enter your address manually."
        : `Could not get location: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // ── 4. Reverse geocode ────────────────────────────────────────────────────
  let placemarks: Location.LocationGeocodedAddress[] = [];
  try {
    placemarks = await Location.reverseGeocodeAsync({
      latitude:  position.coords.latitude,
      longitude: position.coords.longitude,
    });
  } catch {
    return {
      success: false,
      reason:  "geocodingFailed",
      message: "Reverse geocoding failed. Enter your address manually.",
    };
  }

  if (!placemarks || placemarks.length === 0) {
    return {
      success: false,
      reason:  "geocodingFailed",
      message: "Could not identify your location. Enter your address manually.",
    };
  }

  // ── 5. Extract address components (handle partial results) ─────────────────
  const p = placemarks[0];
  const city       = p.city ?? p.subregion ?? "";
  const state      = p.region ?? "";
  const postalCode = p.postalCode ?? "";
  const isPartial  = !city || !state || !postalCode;

  return {
    success:    true,
    city,
    state,
    postalCode,
    latitude:   position.coords.latitude,
    longitude:  position.coords.longitude,
    isPartial,
  };
}

// ── Firestore CRUD ─────────────────────────────────────────────────────────────

function addressesRef(uid: string) {
  return collection(db, "users", uid, "addresses");
}

/**
 * Fetch all saved addresses for a user, most-recent first.
 */
export async function getAddresses(uid: string): Promise<SavedAddress[]> {
  const q    = query(addressesRef(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id:            d.id,
      uid,
      houseFlat:     String(data.houseFlat    ?? ""),
      streetArea:    String(data.streetArea   ?? ""),
      landmark:      String(data.landmark     ?? ""),
      city:          String(data.city         ?? ""),
      state:         String(data.state        ?? ""),
      postalCode:    String(data.postalCode   ?? ""),
      recipientName: String(data.recipientName ?? ""),
      phone:         String(data.phone        ?? ""),
      label:         (data.label as "Home" | "Work" | "Other") ?? "Home",
      notes:         String(data.notes        ?? ""),
      isDefault:     Boolean(data.isDefault),
      createdAt:     data.createdAt as Timestamp,
      updatedAt:     data.updatedAt as Timestamp,
    } satisfies SavedAddress;
  });
}

/**
 * Save a new address. If isDefault is true, demotes all other addresses.
 * Returns the new document ID.
 */
export async function saveAddress(
  uid:     string,
  fields:  AddressFields,
): Promise<string> {
  const ref = addressesRef(uid);

  if (fields.isDefault) {
    // Demote existing defaults
    const existing = await getDocs(query(ref));
    const batch    = writeBatch(db);
    existing.docs
      .filter((d) => d.data().isDefault)
      .forEach((d) => batch.update(d.ref, { isDefault: false }));
    await batch.commit();
  }

  const newDoc = await addDoc(ref, {
    ...fields,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newDoc.id;
}

/**
 * Update an existing address. Re-runs default demotion if needed.
 */
export async function updateAddress(
  uid:       string,
  addressId: string,
  fields:    Partial<AddressFields>,
): Promise<void> {
  const ref    = addressesRef(uid);
  const docRef = doc(ref, addressId);

  if (fields.isDefault) {
    const existing = await getDocs(query(ref));
    const batch    = writeBatch(db);
    existing.docs
      .filter((d) => d.id !== addressId && d.data().isDefault)
      .forEach((d) => batch.update(d.ref, { isDefault: false }));
    await batch.commit();
  }

  await updateDoc(docRef, { ...fields, updatedAt: serverTimestamp() });
}

/**
 * Delete an address document.
 */
export async function deleteAddress(uid: string, addressId: string): Promise<void> {
  await deleteDoc(doc(addressesRef(uid), addressId));
}

/**
 * Set a specific address as the user's default, clearing others.
 */
export async function setDefaultAddress(uid: string, addressId: string): Promise<void> {
  const ref      = addressesRef(uid);
  const existing = await getDocs(query(ref));
  const batch    = writeBatch(db);

  existing.docs.forEach((d) => {
    batch.update(d.ref, { isDefault: d.id === addressId });
  });

  await batch.commit();
}

