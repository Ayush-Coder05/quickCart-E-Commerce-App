import { ActivityIndicator, StyleSheet, Text, Pressable, View } from "react-native";

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  /** Renders a compact, smaller button - useful for inline "Send OTP" placement. */
  small?: boolean;
}

export function AuthButton({
  label,
  onPress,
  loading = false,
  small = false,
}: AuthButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        small && styles.pressableSmall,
        pressed && !loading ? styles.pressed : null,
        loading ? styles.disabled : null,
      ]}
    >
      <View style={[styles.inner, small && styles.innerSmall]}>
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.text, small && styles.textSmall]}>{label}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 12,
    backgroundColor: "#16A34A",
    overflow: "hidden",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pressableSmall: {
    borderRadius: 8,
  },
  inner: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  innerSmall: {
    minHeight: 52, // matches AuthField height
    paddingHorizontal: 12,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  textSmall: {
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.72,
  },
});

