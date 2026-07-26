import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AuthButton } from "../components/auth/AuthButton";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthField } from "../components/auth/AuthField";
import { loginUserWithEmail } from "../utils/auth";
import { ROUTES } from "../utils/routes";
import { AuthErrors, validateEmail, validatePassword } from "../utils/validation";

export default function LoginScreen() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors]     = useState<AuthErrors>({});
  const [loading, setLoading]   = useState(false);

  /** Clear a specific field error as the user types. */
  const clearError = (field: keyof AuthErrors) => {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  };

  const handleLogin = async () => {
    // Validate - email required + valid format, password required
    const emailError    = validateEmail(email);
    const passwordError = validatePassword(password);

    const nextErrors: AuthErrors = { email: emailError, password: passwordError };
    setErrors(nextErrors);

    // Block submit if any validation fails
    if (Object.values(nextErrors).some(Boolean)) return;

    try {
      setLoading(true);
      await loginUserWithEmail(email.trim(), password);
      // Stack replace so back button cannot return to Login
      router.replace(ROUTES.permissionFlow);
    } catch (err: any) {
      const code = err?.code ?? "";
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-login-credentials"
      ) {
        setErrors({ email: "Email or password is incorrect." });
      } else if (code === "auth/too-many-requests") {
        Alert.alert(
          "Too many attempts",
          "Your account has been temporarily locked due to many failed login attempts. Try again later.",
        );
      } else if (code === "auth/network-request-failed") {
        Alert.alert("No internet", "Check your connection and try again.");
      } else {
        Alert.alert("Sign-in failed", "Could not sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in with your email and password."
    >
      {/* Email */}
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

      {/* Password */}
      <AuthField
        label="Password"
        value={password}
        onChangeText={(val) => { setPassword(val); clearError("password"); }}
        error={errors.password}
        placeholder="Enter your password"
        secureTextEntry
        autoComplete="password"
        textContentType="password"
      />

      <View style={styles.forgotRow}>
        <Link href={ROUTES.forgotPassword} style={styles.link}>Forgot password?</Link>
      </View>

      <AuthButton label="Sign in" onPress={handleLogin} loading={loading} />

      <Text style={styles.footerText}>
        New to quickCart?{" "}
        <Link href={ROUTES.signup} style={styles.linkStrong}>Create account</Link>
      </Text>
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  forgotRow: { alignItems: "flex-end", marginTop: -6, marginBottom: 20 },
  link: { color: "#16A34A", fontSize: 13, fontWeight: "800" },
  footerText: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 22,
    textAlign: "center",
  },
  linkStrong: { color: "#16A34A", fontWeight: "900" },
});


