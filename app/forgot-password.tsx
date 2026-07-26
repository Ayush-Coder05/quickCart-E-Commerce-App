import { Link, router } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AuthButton } from "../components/auth/AuthButton";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthField } from "../components/auth/AuthField";
import { OtpInput } from "../components/auth/OtpInput";
import { OtpTimer } from "../components/auth/OtpTimer";
import { auth } from "../utils/firebase";
import { callSendOtp, callVerifyOtp } from "../utils/otpService";
import { ROUTES } from "../utils/routes";
import { AuthErrors, validateOtp } from "../utils/validation";

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpTimerKey, setOtpTimerKey] = useState(0);
  const [otpResetKey, setOtpResetKey] = useState(0);
  const [errors, setErrors] = useState<AuthErrors>({});
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const handleSendOtp = async () => {
    const emailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      ? ""
      : "Enter a valid email address.";

    setErrors({ phone: emailError });
    if (emailError) return;

    try {
      setSendingOtp(true);
      await callSendOtp(normalizedEmail);
      setOtpSent(true);
      setOtpVerified(false);
      setOtp("");
      setOtpResetKey((key) => key + 1);
      setOtpTimerKey((key) => key + 1);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not send OTP. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpError = validateOtp(otp);
    setErrors((current) => ({ ...current, otp: otpError }));
    if (otpError) return;

    try {
      setVerifyingOtp(true);
      await callVerifyOtp(normalizedEmail, otp.trim());
      await sendPasswordResetEmail(auth, normalizedEmail);
      setOtpVerified(true);
      setErrors((current) => ({ ...current, otp: "" }));
      Alert.alert("Reset email sent", "Check your email to set a new password.", [
        { text: "Sign in", onPress: () => router.replace(ROUTES.login) },
      ]);
    } catch (error: any) {
      setErrors((current) => ({
        ...current,
        otp: error?.message || "Could not verify OTP.",
      }));
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <AuthCard
      title="Forgot password"
      subtitle="Verify your email with OTP, then receive a Firebase password reset link."
    >
      <View style={styles.phoneRow}>
        <View style={styles.phoneFieldWrapper}>
          <AuthField
            label="Email address"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (otpSent) {
                setOtpSent(false);
                setOtpVerified(false);
                setOtp("");
                setOtpResetKey((key) => key + 1);
              }
            }}
            error={errors.phone}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
        </View>
        <View style={styles.sendOtpWrapper}>
          <AuthButton
            label={otpVerified ? "Verified" : otpSent ? "Resend" : "Get OTP"}
            onPress={otpVerified ? () => {} : handleSendOtp}
            loading={sendingOtp}
            small
          />
        </View>
      </View>

      {otpSent && !otpVerified ? (
        <>
          <OtpInput
            onComplete={(value) => setOtp(value)}
            onChange={(value) => setOtp(value)}
            error={errors.otp}
            resetKey={otpResetKey}
          />

          <OtpTimer
            seconds={30}
            onResend={handleSendOtp}
            resetKey={otpTimerKey}
          />

          <AuthButton
            label="Verify OTP"
            onPress={handleVerifyOtp}
            loading={verifyingOtp}
          />
        </>
      ) : null}

      {otpVerified ? (
        <View style={styles.verifiedBanner}>
          <Text style={styles.verifiedText}>
            Email verified. Check your inbox for the reset link.
          </Text>
        </View>
      ) : null}

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
  phoneRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  phoneFieldWrapper: { flex: 1 },
  sendOtpWrapper: { paddingTop: 22, width: 96 },
  verifiedBanner: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.28)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
    alignItems: "center",
  },
  verifiedText: {
    color: "#bbf7d0",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  footerText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 22,
    textAlign: "center",
  },
  linkStrong: { color: "#fb923c", fontWeight: "900" },
});

