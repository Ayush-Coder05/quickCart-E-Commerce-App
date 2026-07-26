import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  KeyboardTypeOptions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

interface AuthFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  secureTextEntry?: boolean;
}

export function AuthField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "none",
  autoComplete,
  textContentType,
  secureTextEntry = false,
}: AuthFieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          secureTextEntry={isPassword && !visible}
          style={styles.input}
        />
        {isPassword ? (
          <Pressable
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            accessibilityRole="button"
            onPress={() => setVisible((current) => !current)}
            hitSlop={10}
            style={styles.iconButton}
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={21}
              color="#6B7280"
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 16,
  },
  label: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "700",
  },
  inputRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    paddingLeft: 14,
  },
  inputRowError: {
    borderColor: "#EF4444",
  },
  input: {
    flex: 1,
    color: "#1F2937",
    fontSize: 15,
    paddingVertical: 13,
    paddingRight: 12,
  },
  iconButton: {
    width: 46,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    color: "#EF4444",
    fontSize: 12,
    lineHeight: 17,
  },
});

