// ─────────────────────────────────────────────────────────────────────────────
//  components/admin/CrudModal.tsx
//
//  Generic add/edit modal used by Categories, Products, Cities screens.
//  Renders a set of field configs passed via `fields` prop, handles state,
//  validation, and calls onSave with the form data on submit.
//
//  Supports text, number, multiline, boolean, select, and direct "image" edit!
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL, uploadImage } from "../../utils/api";

const PRIMARY   = "#16A34A";
const ERROR_COL = "#DC2626";

export type FieldType = "text" | "number" | "multiline" | "boolean" | "select" | "image";

export interface FieldDef {
  key:          string;
  label:        string;
  type:         FieldType;
  placeholder?: string;
  required?:    boolean;
  options?:     { label: string; value: string }[];  // for select
  keyboardType?: "default" | "numeric" | "phone-pad" | "email-address";
}

interface Props {
  visible:  boolean;
  title:    string;
  fields:   FieldDef[];
  initial?: Record<string, unknown>;
  saving:   boolean;
  onSave:   (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

// ── Direct Image Editor Component ──────────────────────────────────────────────
function ImageFieldEditor({
  value,
  onChange,
  label,
  required,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  label: string;
  required?: boolean;
  error?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Normalize display uri for Unsplash, uploads, and local/remote URLs
  const displayUri = useMemo(() => {
    if (!value) return "";
    const trimmed = String(value).trim();
    if (trimmed.startsWith("/photo-") || trimmed.startsWith("photo-")) {
      return `https://images.unsplash.com/${trimmed.replace(/^\//, "")}`;
    }
    if (trimmed.startsWith("//")) {
      return `https:${trimmed}`;
    }
    if (trimmed.startsWith("/uploads/")) {
      return `${API_BASE_URL}${trimmed}`;
    }
    return trimmed;
  }, [value]);

  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Media library permission is required to select photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        // Instantly display selected image in preview
        onChange(asset.uri);
        setUploading(true);
        try {
          const finalUrl = await uploadImage(asset.uri, asset.base64);
          onChange(finalUrl);
        } catch (uploadErr) {
          console.warn("Upload failed, keeping base64/local URI:", uploadErr);
          if (asset.base64) {
            onChange(`data:image/jpeg;base64,${asset.base64}`);
          }
        } finally {
          setUploading(false);
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to pick image");
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Camera permission is required to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        // Instantly display selected photo in preview
        onChange(asset.uri);
        setUploading(true);
        try {
          const finalUrl = await uploadImage(asset.uri, asset.base64);
          onChange(finalUrl);
        } catch (uploadErr) {
          console.warn("Upload failed, keeping base64/local URI:", uploadErr);
          if (asset.base64) {
            onChange(`data:image/jpeg;base64,${asset.base64}`);
          }
        } finally {
          setUploading(false);
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to take photo");
      setUploading(false);
    }
  };

  const promptPickerOptions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Gallery", ...(value ? ["Remove Photo"] : [])],
          destructiveButtonIndex: value ? 3 : undefined,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleTakePhoto();
          else if (buttonIndex === 2) handlePickFromGallery();
          else if (buttonIndex === 3) onChange("");
        }
      );
    } else {
      Alert.alert(
        "Edit Product Image",
        "Choose an option to update the image",
        [
          { text: "Take Photo", onPress: handleTakePhoto },
          { text: "Choose from Gallery", onPress: handlePickFromGallery },
          ...(value ? [{ text: "Remove Photo", style: "destructive" as const, onPress: () => onChange("") }] : []),
          { text: "Cancel", style: "cancel" as const },
        ]
      );
    }
  };

  return (
    <View style={styles.imageEditSection}>
      <Text style={styles.fieldLabel}>
        {label}{required ? " *" : ""}
      </Text>

      <Pressable
        onPress={promptPickerOptions}
        style={({ pressed }) => [
          styles.imageCard,
          error ? styles.inputError : null,
          pressed && { opacity: 0.88 },
        ]}
      >
        {displayUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: displayUri }}
              style={styles.imagePreview}
              contentFit="cover"
              cachePolicy="none"
            />
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.uploadingText}>Saving photo...</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={15} color="#fff" />
              <Text style={styles.editBadgeText}>Change Photo</Text>
            </View>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <View style={styles.placeholderIconCircle}>
              <Ionicons name="camera-outline" size={30} color={PRIMARY} />
            </View>
            <Text style={styles.placeholderTitle}>Upload Product Image</Text>
            <Text style={styles.placeholderSub}>Tap to take a photo or select from library</Text>
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
          </View>
        )}
      </Pressable>

      {/* Action Buttons underneath preview */}
      <View style={styles.imageActionRow}>
        <Pressable
          onPress={handleTakePhoto}
          style={styles.actionBtn}
          disabled={uploading}
        >
          <Ionicons name="camera" size={17} color={PRIMARY} />
          <Text style={styles.actionBtnText}>Take Photo</Text>
        </Pressable>

        <Pressable
          onPress={handlePickFromGallery}
          style={styles.actionBtn}
          disabled={uploading}
        >
          <Ionicons name="images" size={17} color={PRIMARY} />
          <Text style={styles.actionBtnText}>Gallery</Text>
        </Pressable>

        {value ? (
          <Pressable
            onPress={() => onChange("")}
            style={[styles.actionBtn, styles.actionBtnDanger]}
            disabled={uploading}
          >
            <Ionicons name="trash-outline" size={17} color={ERROR_COL} />
            <Text style={[styles.actionBtnText, { color: ERROR_COL }]}>Remove</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Optional fallback link to paste URL */}
      <Pressable
        onPress={() => setShowUrlInput(!showUrlInput)}
        style={styles.urlToggleBtn}
      >
        <Ionicons name={showUrlInput ? "chevron-up" : "link-outline"} size={13} color="#6B7280" />
        <Text style={styles.urlToggleText}>
          {showUrlInput ? "Hide image link" : "Paste image link instead"}
        </Text>
      </Pressable>

      {showUrlInput && (
        <View style={styles.urlInputBox}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder="https://example.com/product.jpg"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ── CrudModal ──────────────────────────────────────────────────────────────────
export function CrudModal({
  visible,
  title,
  fields,
  initial,
  saving,
  onSave,
  onCancel,
}: Props) {
  const [form,   setForm]   = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      const defaults: Record<string, unknown> = {};
      fields.forEach((f) => {
        if (f.type === "select" && f.options?.length) {
          defaults[f.key] = initial?.[f.key] ?? f.options[0].value;
        } else {
          defaults[f.key] = initial?.[f.key] ?? (f.type === "boolean" ? false : f.type === "number" ? "" : "");
        }
      });
      setForm(defaults);
      setErrors({});
    }
  }, [visible, initial, fields]);

  const set = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    let valid = true;
    fields.forEach((f) => {
      if (f.required) {
        const val = form[f.key];
        if (val === undefined || val === null || String(val).trim() === "") {
          next[f.key] = `${f.label} is required.`;
          valid = false;
        }
      }
    });
    setErrors(next);
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    await onSave(form);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.overlayBg} onPress={onCancel} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onCancel} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#374151" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {fields.map((f) => (
              <View key={f.key} style={styles.fieldGroup}>
                {f.type === "image" ? (
                  <ImageFieldEditor
                    label={f.label}
                    required={f.required}
                    value={String(form[f.key] ?? "")}
                    onChange={(newVal) => set(f.key, newVal)}
                    error={errors[f.key]}
                  />
                ) : f.type === "boolean" ? (
                  <>
                    <Text style={styles.fieldLabel}>
                      {f.label}{f.required ? " *" : ""}
                    </Text>
                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>{form[f.key] ? "Yes" : "No"}</Text>
                      <Switch
                        value={Boolean(form[f.key])}
                        onValueChange={(v) => set(f.key, v)}
                        trackColor={{ false: "#D1D5DB", true: PRIMARY }}
                        thumbColor="#fff"
                      />
                    </View>
                  </>
                ) : f.type === "select" && f.options ? (
                  <>
                    <Text style={styles.fieldLabel}>
                      {f.label}{f.required ? " *" : ""}
                    </Text>
                    <View style={styles.selectRow}>
                      {f.options.map((opt) => (
                        <Pressable
                          key={opt.value}
                          onPress={() => set(f.key, opt.value)}
                          style={[
                            styles.selectChip,
                            form[f.key] === opt.value && styles.selectChipActive,
                          ]}
                        >
                          <Text style={[styles.selectChipText, form[f.key] === opt.value && styles.selectChipTextActive]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>
                      {f.label}{f.required ? " *" : ""}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        f.type === "multiline" && styles.inputMulti,
                        errors[f.key]           && styles.inputError,
                      ]}
                      value={String(form[f.key] ?? "")}
                      onChangeText={(v) => set(f.key, v)}
                      placeholder={f.placeholder}
                      placeholderTextColor="#9CA3AF"
                      keyboardType={f.keyboardType ?? (f.type === "number" ? "numeric" : "default")}
                      multiline={f.type === "multiline"}
                      numberOfLines={f.type === "multiline" ? 4 : 1}
                      textAlignVertical={f.type === "multiline" ? "top" : "center"}
                    />
                  </>
                )}

                {f.type !== "image" && errors[f.key] ? (
                  <Text style={styles.errorText}>{errors[f.key]}</Text>
                ) : null}
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveText}>Save</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: "flex-end" },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "90%", shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
  },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  sheetTitle:    { fontSize: 17, fontWeight: "800", color: "#1F2937" },
  closeBtn:      { padding: 4 },
  body:          { padding: 20, gap: 0 },

  fieldGroup:    { marginBottom: 16 },
  fieldLabel:    { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    backgroundColor: "#F9FAFB", borderRadius: 10,
    borderWidth: 1, borderColor: "#D1D5DB",
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: "#1F2937",
  },
  inputMulti:  { height: 100, paddingTop: 12 },
  inputError:  { borderColor: ERROR_COL },
  errorText:   { color: ERROR_COL, fontSize: 12, marginTop: 4 },

  switchRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  switchLabel: { fontSize: 14, color: "#374151", fontWeight: "600" },

  selectRow:            { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectChip:           { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: "#D1D5DB", backgroundColor: "#F9FAFB" },
  selectChipActive:     { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  selectChipText:       { fontSize: 13, fontWeight: "600", color: "#374151" },
  selectChipTextActive: { color: "#fff", fontWeight: "700" },

  footer: {
    flexDirection: "row", gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: "#F3F4F6",
  },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: "#D1D5DB", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: PRIMARY, alignItems: "center" },
  saveText:   { fontSize: 15, fontWeight: "700", color: "#fff" },

  // Direct Image Editor Styles
  imageEditSection: { marginBottom: 4 },
  imageCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreviewContainer: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    zIndex: 10,
  },
  uploadingText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  editBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  placeholderContainer: {
    paddingVertical: 26,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
  },
  placeholderIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  placeholderSub: {
    fontSize: 12,
    color: "#6B7280",
  },
  imageActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  actionBtnDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15803D",
  },
  urlToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  urlToggleText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  urlInputBox: {
    marginTop: 8,
  },
});
