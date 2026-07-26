// ─────────────────────────────────────────────────────────────────────────────
//  app/address.tsx
//
//  Delivery address form screen.
//  - "Use Current Location" fetches GPS → reverse geocodes → prefills city/state/postcode
//  - Manual entry fallback for all GPS failure cases
//  - Full field set: house/flat, street, landmark, city, state, postalCode,
//    recipient name, phone, label (Home/Work/Other), notes
//  - Validates required fields before save
//  - Saves to Firestore users/{uid}/addresses subcollection
//  - "Set as default" toggle
//  - Returns to calling screen on success (router.back())
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../utils/firebase";
import {
  AddressFields,
  deleteAddress,
  getLocationForAddress,
  saveAddress,
  updateAddress,
} from "../services/addressService";

const PRIMARY   = "#16A34A";
const ACCENT    = "#DCFCE7";
const BG        = "#F3F4F6";
const TEXT_DARK = "#1F2937";
const TEXT_MID  = "#374151";
const TEXT_MUTED = "#6B7280";
const BORDER    = "#D1D5DB";
const ERROR_COL = "#DC2626";

const LABELS: ("Home" | "Work" | "Other")[] = ["Home", "Work", "Other"];

// ── Validation ─────────────────────────────────────────────────────────────────

interface FormErrors {
  houseFlat?:    string;
  streetArea?:   string;
  city?:         string;
  state?:        string;
  postalCode?:   string;
  recipientName?: string;
  phone?:        string;
}

function validateForm(fields: AddressFields): FormErrors {
  const errors: FormErrors = {};
  if (!fields.houseFlat.trim())    errors.houseFlat    = "Enter house/flat number.";
  if (!fields.streetArea.trim())   errors.streetArea   = "Enter street or area.";
  if (!fields.city.trim())         errors.city         = "Enter city name.";
  if (!fields.state.trim())        errors.state        = "Enter state name.";
  if (!fields.postalCode.trim())   errors.postalCode   = "Enter postal code.";
  else if (!/^\d{6}$/.test(fields.postalCode.trim())) errors.postalCode = "Enter a valid 6-digit postal code.";
  if (!fields.recipientName.trim()) errors.recipientName = "Enter recipient name.";
  if (!fields.phone.trim())        errors.phone        = "Enter phone number.";
  else if (!/^\d{10}$/.test(fields.phone.replace(/\D/g, ""))) errors.phone = "Enter a valid 10-digit phone number.";
  return errors;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AddressScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ addressId?: string }>();
  const editingId = params.addressId;

  const [locLoading, setLocLoading] = useState(false);
  const [locBanner,  setLocBanner]  = useState("");
  const [locIsError, setLocIsError] = useState(false);

  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors]   = useState<FormErrors>({});

  const [form, setForm] = useState<AddressFields>({
    houseFlat:    "",
    streetArea:   "",
    landmark:     "",
    city:         "",
    state:        "",
    postalCode:   "",
    recipientName: "",
    phone:        "",
    label:        "Home",
    notes:        "",
    isDefault:    false,
  });

  const scrollRef = useRef<ScrollView>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const setField = useCallback(
    (key: keyof AddressFields, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      // Clear field error on change
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [],
  );

  // ── Use Current Location ──────────────────────────────────────────────────────

  const handleUseLocation = useCallback(async () => {
    setLocLoading(true);
    setLocBanner("");
    setLocIsError(false);

    const result = await getLocationForAddress();

    if (result.success) {
      setForm((prev) => ({
        ...prev,
        city:       result.city       || prev.city,
        state:      result.state      || prev.state,
        postalCode: result.postalCode || prev.postalCode,
      }));
      setErrors((prev) => ({
        ...prev,
        city:       result.city       ? undefined : prev.city,
        state:      result.state      ? undefined : prev.state,
        postalCode: result.postalCode ? undefined : prev.postalCode,
      }));

      if (result.isPartial) {
        setLocBanner("Location detected. Some fields could not be auto-filled - please complete them manually.");
        setLocIsError(false);
      } else {
        setLocBanner("Location detected and address prefilled.");
        setLocIsError(false);
      }
    } else {
      setLocIsError(true);

      if (result.reason === "permanentlyDenied") {
        setLocBanner("Location permission permanently denied.");
        Alert.alert(
          "Permission Required",
          "Location permission is permanently denied. Open Settings to enable it.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
      } else if (result.reason === "serviceDisabled") {
        setLocBanner("GPS is disabled. Enable Location Services in Settings.");
      } else if (result.reason === "timeout") {
        setLocBanner("Location timed out. Tap to retry or enter address manually.");
      } else {
        setLocBanner(result.message || "Could not detect location. Enter address manually.");
      }
    }

    setLocLoading(false);
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    const formErrors = validateForm(form);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Not signed in", "Please sign in to save your address.");
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await updateAddress(uid, editingId, form);
      } else {
        await saveAddress(uid, form);
      }
      router.back();
    } catch (err: unknown) {
      Alert.alert("Error", `Could not save address: ${err instanceof Error ? err.message : "Please try again."}`);
    } finally {
      setSaving(false);
    }
  }, [form, editingId]);

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!editingId) return;
    Alert.alert("Delete Address", "Are you sure you want to delete this address?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const uid = auth.currentUser?.uid;
          if (!uid) return;
          try {
            setDeleting(true);
            await deleteAddress(uid, editingId);
            router.back();
          } catch {
            Alert.alert("Error", "Could not delete address. Please try again.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [editingId]);

  // ── Render ────────────────────────────────────────────────────────────────────

  const Field = useCallback(
    ({
      label,
      fieldKey,
      placeholder,
      keyboardType = "default",
      maxLength,
      multiline = false,
    }: {
      label: string;
      fieldKey: keyof AddressFields;
      placeholder: string;
      keyboardType?: "default" | "phone-pad" | "numeric" | "email-address";
      maxLength?: number;
      multiline?: boolean;
    }) => (
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          style={[
            styles.textInput,
            multiline && styles.textInputMulti,
            errors[fieldKey as keyof FormErrors] ? styles.inputError : null,
          ]}
          value={String(form[fieldKey] ?? "")}
          onChangeText={(val) => setField(fieldKey, val)}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          textAlignVertical={multiline ? "top" : "center"}
        />
        {errors[fieldKey as keyof FormErrors] ? (
          <Text style={styles.errorText}>{errors[fieldKey as keyof FormErrors]}</Text>
        ) : null}
      </View>
    ),
    [form, errors, setField],
  );

  return (
    <View style={[styles.screen, { paddingTop: Platform.OS === "ios" ? insets.top : 0 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {editingId ? "Edit Address" : "Add Address"}
        </Text>
        {editingId ? (
          <Pressable onPress={handleDelete} style={styles.deleteBtn} disabled={deleting}>
            {deleting
              ? <ActivityIndicator size="small" color={ERROR_COL} />
              : <Ionicons name="trash-outline" size={22} color={ERROR_COL} />}
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Use Current Location ─────────────────────────────────────── */}
        <Pressable
          onPress={handleUseLocation}
          disabled={locLoading}
          style={({ pressed }) => [styles.locBtn, pressed && { opacity: 0.8 }]}
        >
          {locLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="locate" size={18} color="#fff" />
          )}
          <Text style={styles.locBtnText}>
            {locLoading ? "Detecting location..." : "Use Current Location"}
          </Text>
        </Pressable>

        {locBanner ? (
          <View style={[styles.banner, locIsError ? styles.bannerError : styles.bannerSuccess]}>
            <Text style={[styles.bannerText, locIsError ? styles.bannerTextError : styles.bannerTextSuccess]}>
              {locBanner}
            </Text>
          </View>
        ) : null}

        {/* ── Address Type / Label ──────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Address Type</Text>
        <View style={styles.labelRow}>
          {LABELS.map((lbl) => (
            <Pressable
              key={lbl}
              onPress={() => setField("label", lbl)}
              style={[styles.labelChip, form.label === lbl && styles.labelChipActive]}
            >
              <Ionicons
                name={lbl === "Home" ? "home" : lbl === "Work" ? "business" : "location"}
                size={14}
                color={form.label === lbl ? PRIMARY : TEXT_MID}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.labelChipText, form.label === lbl && styles.labelChipTextActive]}>
                {lbl}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Address Details ───────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Address Details</Text>
        <Field label="House / Flat / Building *" fieldKey="houseFlat"  placeholder="e.g. A-204, Green Heights" />
        <Field label="Street / Area *"          fieldKey="streetArea" placeholder="e.g. MG Road, Sector 14" />
        <Field label="Landmark (optional)"      fieldKey="landmark"   placeholder="e.g. Near Reliance Mart" />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.fieldLabel}>City *</Text>
            <TextInput
              style={[styles.textInput, errors.city ? styles.inputError : null]}
              value={form.city}
              onChangeText={(v) => setField("city", v)}
              placeholder="City"
              placeholderTextColor="#9CA3AF"
            />
            {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>State *</Text>
            <TextInput
              style={[styles.textInput, errors.state ? styles.inputError : null]}
              value={form.state}
              onChangeText={(v) => setField("state", v)}
              placeholder="State"
              placeholderTextColor="#9CA3AF"
            />
            {errors.state ? <Text style={styles.errorText}>{errors.state}</Text> : null}
          </View>
        </View>

        <Field label="Postal Code *" fieldKey="postalCode" placeholder="6-digit PIN" keyboardType="numeric" maxLength={6} />

        {/* ── Recipient Details ─────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Recipient Details</Text>
        <Field label="Recipient Name *" fieldKey="recipientName" placeholder="Full name" />
        <Field label="Phone Number *"   fieldKey="phone"          placeholder="10-digit mobile" keyboardType="phone-pad" maxLength={10} />

        {/* ── Notes ────────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Additional Notes</Text>
        <Field label="Delivery Instructions (optional)" fieldKey="notes" placeholder="e.g. Ring bell twice, leave at door..." multiline />

        {/* ── Default Toggle ────────────────────────────────────────────── */}
        <View style={styles.defaultRow}>
          <View>
            <Text style={styles.defaultTitle}>Set as Default Address</Text>
            <Text style={styles.defaultSub}>Used automatically at checkout</Text>
          </View>
          <Switch
            value={form.isDefault}
            onValueChange={(v) => setField("isDefault", v)}
            trackColor={{ false: "#D1D5DB", true: PRIMARY }}
            thumbColor="#fff"
          />
        </View>
      </ScrollView>

      {/* ── Save Button ──────────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }, saving && { opacity: 0.6 }]}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="checkmark-circle" size={20} color="#fff" />}
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Address"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: BG },
  header:   {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  backBtn:  { padding: 4, marginRight: 8 },
  deleteBtn: { padding: 4, marginLeft: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: TEXT_DARK, textAlign: "center" },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 0 },

  // Location button
  locBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: PRIMARY, borderRadius: 12,
    paddingVertical: 14, marginBottom: 12,
  },
  locBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Banner
  banner:          { borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1 },
  bannerSuccess:   { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  bannerError:     { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  bannerText:      { fontSize: 13, fontWeight: "500", lineHeight: 19 },
  bannerTextSuccess: { color: "#15803D" },
  bannerTextError:   { color: "#B91C1C" },

  // Section
  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: TEXT_MUTED,
    textTransform: "uppercase", letterSpacing: 0.6,
    marginTop: 20, marginBottom: 10,
  },

  // Label chips
  labelRow:     { flexDirection: "row", gap: 8, marginBottom: 4 },
  labelChip:    {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: BORDER, alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff", flexDirection: "row",
  },
  labelChipActive:     { backgroundColor: ACCENT, borderColor: PRIMARY },
  labelChipText:       { fontSize: 13, fontWeight: "600", color: TEXT_MID },
  labelChipTextActive: { color: PRIMARY },

  // Fields
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: TEXT_MID, marginBottom: 6 },
  textInput: {
    backgroundColor: "#fff", borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: TEXT_DARK,
  },
  textInputMulti: { height: 90, paddingTop: 12 },
  inputError:     { borderColor: ERROR_COL },
  errorText:      { color: ERROR_COL, fontSize: 12, marginTop: 4 },
  row:            { flexDirection: "row", marginBottom: 12 },

  // Default toggle
  defaultRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    marginTop: 16,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  defaultTitle: { fontSize: 15, fontWeight: "600", color: TEXT_DARK },
  defaultSub:   { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },

  // Footer + Save
  footer: {
    backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "#E5E7EB",
  },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 15,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

