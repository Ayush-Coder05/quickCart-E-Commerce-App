import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AuthButton } from "../components/auth/AuthButton";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthField } from "../components/auth/AuthField";
import { callSendOtp } from "../utils/otpService";
import { userExistsByEmail } from "../utils/auth";
import { ROUTES } from "../utils/routes";
import {
  AuthErrors,
  normalizePhone,
  validateConfirmPassword,
  validateEmail,
  validateMobile,
  validateName,
  validatePassword,
} from "../utils/validation";

export default function CreateAccountScreen() {
  const [name, setName]                       = useState("");
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mobile, setMobile]                   = useState("");

  const [errors, setErrors] = useState<AuthErrors>({});
  const [loading, setLoading] = useState(false);

  const clearError = (field: keyof AuthErrors) => {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  };

  // ── Continue → validate → send OTP → navigate to OTP screen ──────────────
  const handleContinue = async () => {
    const nextErrors: AuthErrors = {
      name:            validateName(name),
      email:           validateEmail(email),
      password:        validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
      // Mobile is optional - only validate if the user typed something
      phone:           validateMobile(mobile),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      setLoading(true);
      const normalizedEmail = email.trim().toLowerCase();
      const exists = await userExistsByEmail(normalizedEmail);
      if (exists) {
        setErrors({ email: "This email address is already registered. Please sign in instead." });
        return;
      }

      // Send real OTP to the user's email via Cloud Function
      await callSendOtp(normalizedEmail);

      // Navigate to OTP verification screen, passing registration data as params
      router.push({
        pathname: "/otp-verification" as const,
        params: {
          email:    normalizedEmail,
          name:     name.trim(),
          password: password,
          mobile:   normalizePhone(mobile),
        },
      });
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      
      // Specifically catch our custom connection error from otpService
      if (msg.includes("Could not connect to the local OTP server") || msg.includes("Network request failed")) {
        Alert.alert(
          "Server Offline",
          "Could not connect to the local OTP server.\n\nPlease open a new terminal and run:\n  node otp-server.js\nor double-click start-otp-server.bat"
        );
      } else if (msg.includes("PERMISSION_DENIED") || msg.includes("Missing or insufficient permissions")) {
        Alert.alert(
          "OTP service permissions need publishing",
          "The OTP server reached Firebase, but Firestore rules are blocking its OTP collection. Publish the updated shared_firestore.rules in Firebase Console, then try again."
        );
      } else if (msg.includes("Too many OTP requests") || msg.includes("resource-exhausted")) {
        Alert.alert(
          "Too many requests",
          "You have requested too many OTPs. Please wait a few minutes before trying again."
        );
      } else {
        Alert.alert("Could not send OTP", msg || "Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create account"
      subtitle="Fill in your details to get started."
      scrollable
    >
      {/* ── Row 1: Full name + Mobile ──────────────────────────────────── */}
      <View style={styles.row}>
        <View style={styles.halfField}>
          <AuthField
            label="Full name"
            value={name}
            onChangeText={(val) => { setName(val); clearError("name"); }}
            error={errors.name}
            placeholder="Ayush Sharma"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />
        </View>
        <View style={styles.halfField}>
          <AuthField
            label="Mobile (optional)"
            value={mobile}
            onChangeText={(val) => { setMobile(val); clearError("phone"); }}
            error={errors.phone}
            placeholder="10-digit"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
        </View>
      </View>

      {/* ── Row 2: Email (full width) ──────────────────────────────────── */}
      <AuthField
        label="Email address"
        value={email}
        onChangeText={(val) => { setEmail(val); clearError("email"); }}
        error={errors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />

      {/* ── Row 3: Password + Confirm password ────────────────────────── */}
      <View style={styles.row}>
        <View style={styles.halfField}>
          <AuthField
            label="Password"
            value={password}
            onChangeText={(val) => { setPassword(val); clearError("password"); }}
            error={errors.password}
            placeholder="Min 6 chars"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
        </View>
        <View style={styles.halfField}>
          <AuthField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={(val) => { setConfirmPassword(val); clearError("confirmPassword"); }}
            error={errors.confirmPassword}
            placeholder="Repeat password"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
        </View>
      </View>

      {/* ── OTP hint ──────────────────────────────────────────────────── */}
      <View style={styles.hint}>
        <Text style={styles.hintText}>
          We'll send a 6-digit code to your email to verify your account.
        </Text>
      </View>

      {/* ── Continue (sends OTP + navigates to verify screen) ─────────── */}
      <AuthButton
        label="Send Verification Code"
        onPress={handleContinue}
        loading={loading}
      />

      <Text style={styles.footerText}>
        Already have an account?{" "}
        <Link href={ROUTES.login} style={styles.linkStrong}>Sign in</Link>
      </Text>
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 0,
  },
  halfField: {
    flex: 1,
  },
  hint: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  hintText: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  footerText: {
    color:     "#6B7280",
    fontSize:  14,
    lineHeight: 21,
    marginTop: 16,
    textAlign: "center",
  },
  linkStrong: { color: "#16A34A", fontWeight: "900" },
});
