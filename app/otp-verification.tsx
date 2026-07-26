import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AuthButton } from "../components/auth/AuthButton";
import { AuthCard } from "../components/auth/AuthCard";
import { OtpInput } from "../components/auth/OtpInput";
import { OtpTimer } from "../components/auth/OtpTimer";
import { registerUserWithEmail } from "../utils/auth";
import { callSendOtp, callVerifyOtp } from "../utils/otpService";
import { ROUTES } from "../utils/routes";
import { validateOtp } from "../utils/validation";

const RESEND_COOLDOWN_SECONDS = 60;

export default function OtpVerificationScreen() {
  const params = useLocalSearchParams();

  // Registration data passed from signup screen
  const email    = (params.email    as string) ?? "";
  const name     = (params.name     as string) ?? "";
  const password = (params.password as string) ?? "";
  const mobile   = (params.mobile   as string) ?? "";

  const [otp, setOtp]               = useState("");
  const [otpError, setOtpError]     = useState("");
  const [otpResetKey, setOtpResetKey] = useState(0);
  const [otpTimerKey, setOtpTimerKey] = useState(0);

  const [verifying, setVerifying]   = useState(false);
  const [resending, setResending]   = useState(false);

  const [cooldown, setCooldown]     = useState(RESEND_COOLDOWN_SECONDS);
  const [canResend, setCanResend]   = useState(false);
  const [statusMsg, setStatusMsg]   = useState("");
  const [isError, setIsError]       = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cooldown timer ────────────────────────────────────────────────────────
  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startCooldown();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startCooldown]);

  // ── Verify OTP - calls Cloud Function, registers user on success ──────────
  const handleVerifyOtp = async () => {
    // Client-side format check first
    const formatError = validateOtp(otp);
    if (formatError) {
      setOtpError(formatError);
      return;
    }
    setOtpError("");

    try {
      setVerifying(true);

      // 1. Verify OTP via Cloud Function (checks expiry, used-flag, attempts)
      await callVerifyOtp(email, otp.trim());

      // 2. OTP verified - now create the Firebase Auth account
      setStatusMsg("Done Email verified! Creating your account...");
      setIsError(false);

      await registerUserWithEmail(name, email, password, mobile || undefined);

      // 3. Navigate - stack replace prevents back to OTP / signup / login
      router.replace(ROUTES.permissionFlow);
    } catch (err: any) {
      const msg:  string = err?.message ?? "Verification failed. Please try again.";
      // Firebase HttpsError codes from verifyEmailOtp Cloud Function:
      //   failed-precondition → already used
      //   deadline-exceeded   → expired
      //   resource-exhausted  → max attempts or rate limit
      //   unauthenticated     → wrong OTP (with attempts remaining)
      //   not-found           → no OTP sent
      const code: string = err?.code ?? "";

      if (code === "failed-precondition" || msg.includes("already been used")) {
        setOtpError("This OTP has already been used. Tap 'Resend' to get a new one.");
      } else if (code === "deadline-exceeded" || msg.includes("expired")) {
        setOtpError("This OTP has expired. Tap 'Resend' to get a new one.");
      } else if (code === "resource-exhausted") {
        setOtpError(msg || "Too many attempts. Please request a new code.");
      } else if (code === "unauthenticated" || msg.includes("Incorrect OTP")) {
        setOtpError(msg || "Incorrect OTP. Please try again.");
      } else if (code === "not-found" || msg.includes("No OTP was sent")) {
        setOtpError("No OTP found. Please go back and request a new one.");
      } else if (msg.includes("auth/email-already-in-use")) {
        setStatusMsg("");
        Alert.alert(
          "Email already registered",
          "An account with this email already exists. Please sign in instead.",
          [{ text: "Sign in", onPress: () => router.replace(ROUTES.login) }]
        );
      } else if (code === "internal" || code === "network-error" || msg.includes("network") || msg.includes("Failed to fetch")) {
        Alert.alert("Network error", "Check your connection and try again.");
      } else {
        setOtpError(msg || "Verification failed. Please try again.");
      }
    } finally {
      setVerifying(false);
    }
  };

  // ── Resend OTP - calls Cloud Function again, resets timer ────────────────
  const handleResend = async () => {
    if (!canResend) return;
    try {
      setResending(true);
      setOtpError("");
      setOtp("");
      setOtpResetKey((k) => k + 1);
      setOtpTimerKey((k) => k + 1);

      await callSendOtp(email);

      startCooldown();
      setStatusMsg("New code sent! Check your inbox (and spam folder).");
      setIsError(false);
    } catch (err: any) {
      const code: string = err?.code ?? "";
      const msg:  string = err?.message ?? "";
      if (code === "resource-exhausted" || msg.includes("Too many")) {
        Alert.alert(
          "Too many requests",
          msg || "You have requested too many OTPs. Please wait before trying again."
        );
      } else if (code === "internal" || code === "network-error" || msg.includes("network") || msg.includes("Failed")) {
        Alert.alert("Network error", "Check your connection and try again.");
      } else {
        Alert.alert("Error", msg || "Could not resend code. Please try again.");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthCard
      title="Verify your email"
      subtitle="We sent a 6-digit code to:"
    >
      {/* Email display */}
      <View style={styles.emailBox}>
        <Text style={styles.emailText}>{email || "your email address"}</Text>
      </View>

      <Text style={styles.instruction}>
        Enter the 6-digit code from your inbox to verify and complete signup.
        The code expires in 10 minutes.
      </Text>

      <OtpInput
        onComplete={(val) => setOtp(val)}
        onChange={(val) => { setOtp(val); if (otpError) setOtpError(""); }}
        error={otpError}
        resetKey={otpResetKey}
      />

      <OtpTimer
        seconds={30}
        onResend={canResend ? handleResend : undefined}
        resetKey={otpTimerKey}
      />

      {/* Status banner */}
      {statusMsg ? (
        <View style={[styles.statusBox, isError ? styles.statusError : styles.statusSuccess]}>
          <Text style={[styles.statusText, isError ? styles.statusTextError : styles.statusTextSuccess]}>
            {statusMsg}
          </Text>
        </View>
      ) : null}

      {/* Primary action */}
      <AuthButton
        label="Verify & Create Account"
        onPress={handleVerifyOtp}
        loading={verifying}
      />

      {/* Resend section */}
      <View style={styles.resendSection}>
        <Text style={styles.resendLabel}>Didn&apos;t receive the email?</Text>
        {canResend ? (
          <AuthButton
            label="Resend Verification Code"
            onPress={handleResend}
            loading={resending}
            small
          />
        ) : (
          <Text style={styles.cooldownText}>
            You can resend in{" "}
            <Text style={styles.cooldownNum}>{cooldown}s</Text>
          </Text>
        )}
      </View>
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  emailBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emailText: {
    color: "#1F2937",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  instruction: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: "center",
  },

  // Status banner
  statusBox: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    marginTop: 16,
    borderWidth: 1,
  },
  statusSuccess: { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  statusError:   { backgroundColor: "#FEE2E2", borderColor: "#FECACA" },
  statusText:    { fontSize: 13, fontWeight: "600", textAlign: "center" },
  statusTextSuccess: { color: "#15803D" },
  statusTextError:   { color: "#B91C1C" },

  // Resend
  resendSection: {
    marginTop: 20,
    alignItems: "center",
    gap: 10,
  },
  resendLabel: { color: "#6B7280", fontSize: 13, fontWeight: "500" },
  cooldownText: { color: "#9CA3AF", fontSize: 13, fontWeight: "500" },
  cooldownNum:  { fontWeight: "700", color: "#6B7280" },
});

