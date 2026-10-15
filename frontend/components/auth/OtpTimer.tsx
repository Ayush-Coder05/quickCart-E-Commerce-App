import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, Pressable, View } from "react-native";

interface OtpTimerProps {
  /** Seconds to count down before showing Resend. Default: 30 */
  seconds?: number;
  /** Called when user taps Resend. If undefined, button is shown but non-functional. */
  onResend?: () => void;
  /** Change this key to restart the countdown. */
  resetKey?: number;
}

export function OtpTimer({ seconds = 30, onResend, resetKey }: OtpTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = () => {
    setRemaining(seconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start on mount
  useEffect(() => {
    startCountdown();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Restart when resetKey changes
  useEffect(() => {
    if (resetKey !== undefined) startCountdown();
  }, [resetKey]);

  const handleResend = () => {
    startCountdown();
    if (onResend) onResend();
  };

  if (remaining > 0) {
    return (
      <View style={styles.row}>
        <Text style={styles.timerText}>Resend OTP in </Text>
        <Text style={styles.timerCount}>{remaining}s</Text>
      </View>
    );
  }

  return (
    <Pressable onPress={handleResend} style={styles.resendBtn} accessibilityRole="button">
      {({ pressed }) => (
        <Text style={[styles.resendText, pressed && styles.resendTextPressed]}>
          Resend OTP
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  timerText: {
    color: "#6B7280",
    fontSize: 13,
  },
  timerCount: {
    color: "#16A34A",
    fontSize: 13,
    fontWeight: "800",
  },
  resendBtn: {
    alignSelf: "center",
    marginBottom: 18,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendText: {
    color: "#16A34A",
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  resendTextPressed: {
    opacity: 0.7,
  },
});

