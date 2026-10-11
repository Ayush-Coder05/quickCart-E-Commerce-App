import { Link, router } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { AuthButton } from "../components/auth/AuthButton";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthField } from "../components/auth/AuthField";
import { auth } from "../utils/firebase";
import { ROUTES } from "../utils/routes";
import { AuthErrors } from "../utils/validation";

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<AuthErrors>({});
  const [sendingReset, setSendingReset] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const handleSendReset = async () => {
    const emailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      ? ""
      : "Enter a valid email address.";

    setErrors({ phone: emailError });
    if (emailError) return;

    try {
      setSendingReset(true);
      await sendPasswordResetEmail(auth, normalizedEmail);
      Alert.alert("Reset email sent", "Check your inbox to set a new password.", [
        { text: "Sign in", onPress: () => router.replace(ROUTES.login) },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not send the reset email. Please try again.");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <AuthCard
      title="Forgot password"
      subtitle="Enter your email and we will send a password-reset link."
    >
      <AuthField
        label="Email address"
        value={email}
        onChangeText={setEmail}
        error={errors.phone}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />

      <AuthButton
        label="Send reset link"
        onPress={handleSendReset}
        loading={sendingReset}
      />

      <Text style={styles.footerText}>
        Remembered it?{" "}
        <Link href={ROUTES.login} style={styles.linkStrong}>
          Sign in
        </Link>
      </Text>
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  footerText: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 18,
    textAlign: "center",
  },
  linkStrong: { color: "#16A34A", fontWeight: "900" },
});
