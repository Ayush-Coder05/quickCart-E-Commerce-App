// ─────────────────────────────────────────────────────────────────────────────
//  services/addressService.ts
//
//  Delivery address management using expo-location and MongoDB API (/api/addresses).
// ─────────────────────────────────────────────────────────────────────────────

import * as Location from "expo-location";
import { api } from "../utils/api";
import {
  getLocationPermissionStatus,
  requestLocationPermission,
} from "./locationService";

// ── Address Fields ─────────────────────────────────────────────────────────────

export interface AddressFields {
  city:          string;
  state:         string;
  postalCode:    string;
  houseFlat:     string;
  streetArea:    string;
  landmark:      string;
  recipientName: string;
  phone:         string;
  label:         "Home" | "Work" | "Other";
  notes:         string;
  isDefault:     boolean;
}

export interface SavedAddress extends AddressFields {
  id:        string;
  uid:       string;
  createdAt: any;
  updatedAt: any;
}

// ── GPS + Geocode → Address Prefill ───────────────────────────────────────────

export type GeocodedPrefill = {
  success:    true;
  city:       string;
  state:      string;
  postalCode: string;
  latitude:   number;
  longitude:  number;
  isPartial:  boolean;
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

export async function getLocationForAddress(): Promise<GeocodedResult> {
  try {
    const serviceEnabled = await Location.hasServicesEnabledAsync();
    if (!serviceEnabled) {
      return {
        success: false,
        reason:  "serviceDisabled",
        message: "Location services (GPS) are disabled. Please enable them in Settings.",
      };
    }
  } catch {}

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

// ── MongoDB CRUD ─────────────────────────────────────────────────────────────

export async function getAddresses(uid: string): Promise<SavedAddress[]> {
  try {
    const res = await api.get<{ success: boolean; addresses: any[] }>("/api/addresses");
    if (res?.addresses && Array.isArray(res.addresses)) {
      return res.addresses.map((a: any) => ({
        id:            String(a._id || a.id),
        uid:           String(a.userId || uid),
        houseFlat:     String(a.houseFlat ?? ""),
        streetArea:    String(a.streetArea ?? ""),
        landmark:      String(a.landmark ?? ""),
        city:          String(a.city ?? ""),
        state:         String(a.state ?? ""),
        postalCode:    String(a.postalCode ?? ""),
        recipientName: String(a.recipientName ?? ""),
        phone:         String(a.phone ?? ""),
        label:         (a.label as "Home" | "Work" | "Other") ?? "Home",
        notes:         String(a.notes ?? ""),
        isDefault:     Boolean(a.isDefault),
        createdAt:     a.createdAt ? new Date(a.createdAt) : new Date(),
        updatedAt:     a.updatedAt ? new Date(a.updatedAt) : new Date(),
      }));
    }
  } catch (err) {
    console.warn("[addressService] MongoDB getAddresses failed:", err);
  }
  return [];
}

export async function saveAddress(
  uid:     string,
  fields:  AddressFields,
): Promise<string> {
  let newId = `addr_${Date.now()}`;
  try {
    const res = await api.post<{ success: boolean; address: any }>("/api/addresses", fields);
    if (res?.address?._id || res?.address?.id) {
      newId = String(res.address._id || res.address.id);
    }
  } catch (err) {
    console.warn("[addressService] MongoDB saveAddress failed:", err);
  }
  return newId;
}

export async function updateAddress(
  uid:       string,
  addressId: string,
  fields:    Partial<AddressFields>,
): Promise<void> {
  try {
    await api.put(`/api/addresses/${addressId}`, fields);
  } catch (err) {
    console.warn("[addressService] MongoDB updateAddress error:", err);
  }
}

export async function deleteAddress(uid: string, addressId: string): Promise<void> {
  try {
    await api.delete(`/api/addresses/${addressId}`);
  } catch (err) {
    console.warn("[addressService] MongoDB deleteAddress error:", err);
  }
}

export async function setDefaultAddress(uid: string, addressId: string): Promise<void> {
  try {
    await api.put(`/api/addresses/${addressId}`, { isDefault: true });
  } catch (err) {
    console.warn("[addressService] MongoDB setDefaultAddress error:", err);
  }
}
