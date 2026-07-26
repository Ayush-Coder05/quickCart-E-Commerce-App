// ─────────────────────────────────────────────────────────────────────────────
//  components/admin/CrudModal.tsx
//
//  Generic add/edit modal used by Categories, Products, Cities screens.
//  Renders a set of field configs passed via `fields` prop, handles state,
//  validation, and calls onSave with the form data on submit.
//
//  When `imageSectionProps` is provided the modal renders a product-image
//  picker section ABOVE the fields: preview + "Change Image" button.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

const PRIMARY   = "#16A34A";
const ERROR_COL = "#DC2626";

export type FieldType = "text" | "number" | "multiline" | "boolean" | "select";

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
  visible:          boolean;
  title:            string;
  fields:           FieldDef[];
  initial?:         Record<string, unknown>;
  saving:           boolean;
  onSave:           (data: Record<string, unknown>) => Promise<void>;
  onCancel:         () => void;

}

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
        defaults[f.key] = initial?.[f.key] ?? (f.type === "boolean" ? false : f.type === "number" ? "" : "");
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
                <Text style={styles.fieldLabel}>
                  {f.label}{f.required ? " *" : ""}
                </Text>

                {f.type === "boolean" ? (
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>{form[f.key] ? "Yes" : "No"}</Text>
                    <Switch
                      value={Boolean(form[f.key])}
                      onValueChange={(v) => set(f.key, v)}
                      trackColor={{ false: "#D1D5DB", true: PRIMARY }}
                      thumbColor="#fff"
                    />
                  </View>
                ) : f.type === "select" && f.options ? (
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
                ) : (
                  <>
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
                    {/* Live image preview for URL fields */}
                    {f.key === "imageUrl" && String(form[f.key] ?? "").startsWith("http") && (
                      <View style={styles.previewBox}>
                        <Image
                          source={{ uri: String(form[f.key]) }}
                          style={styles.previewImage}
                          contentFit="cover"
                        />
                        <Text style={styles.previewLabel}>Image Preview</Text>
                      </View>
                    )}
                  </>
                )}

                {errors[f.key] ? (
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

  selectRow:         { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectChip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: "#D1D5DB", backgroundColor: "#F9FAFB" },
  selectChipActive:  { backgroundColor: "#F3E5F5", borderColor: PRIMARY },
  selectChipText:    { fontSize: 13, fontWeight: "600", color: "#374151" },
  selectChipTextActive: { color: PRIMARY },

  footer: {
    flexDirection: "row", gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: "#F3F4F6",
  },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: "#D1D5DB", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  saveBtn:    { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: PRIMARY, alignItems: "center" },
  saveText:   { fontSize: 15, fontWeight: "700", color: "#fff" },

  previewBox:   { marginTop: 10, alignItems: "center", gap: 6 },
  previewImage: { width: "100%", height: 160, borderRadius: 12, backgroundColor: "#F3F4F6" },
  previewLabel: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
});



