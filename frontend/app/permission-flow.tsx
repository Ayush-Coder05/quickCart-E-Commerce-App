// ─────────────────────────────────────────────────────────────────────────────
//  app/permission-flow.tsx
//
//  Two-step permission flow shown after login / signup:
//    Step 0 - Notification permission  (grant or deny → both continue)
//    Step 1 - Location permission  →  detect Indian state  →  Home
//                                  →  any failure          →  State Picker
//
//  Navigation:
//    router.replace('/permission-flow')  from login/signup
//    CommonActions.reset to /home?state=X  on success
//    router.push to /state-picker  on failure
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  detectIndianState,
  LocationFailureReason,
} from "../services/locationService";
import {
  requestNotificationPermission,
} from "../services/notificationService";
import { stateStore } from "../utils/stateStore";
import { ROUTES } from "../utils/routes";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 0 | 1;

type LocStatus =
  | "idle"
  | "detecting"
  | "success"
  | "failed";

interface LocError {
  reason: LocationFailureReason;
  message: string;
}

// ── Card data ─────────────────────────────────────────────────────────────────

const NOTIFICATION_CARD = {
  icon: "notifications",
  title: "Stay in the loop",
  description:
    "Allow notifications to receive state-specific deals, offers, and order updates from quickCart.",
  bullets: [
    "Exclusive deals & discounts",
    "Real-time order updates",
    "New arrivals in your state",
  ],
  btnLabel: "Allow Notifications",
  skipLabel: "Skip for now",
  accentColor: "#3B82F6",
};

const LOCATION_CARD = {
  icon: "location",
  title: "Detect your state",
  description:
    "quickCart uses your location to show products, banners, and offers available in your Indian state.",
  bullets: [
    "Auto-detect your state",
    "State-specific products",
    "Local deals & pricing",
  ],
  btnLabel: "Allow Location",
  skipLabel: "Select state manually",
  accentColor: "#16A34A",
};

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────

export default function PermissionFlowScreen() {
  const insets = useSafeAreaInsets();

  const [step,      setStep]      = useState<Step>(0);
  const [locStatus, setLocStatus] = useState<LocStatus>("idle");
  const [locError,  setLocError]  = useState<LocError | null>(null);
  const [notifBusy, setNotifBusy] = useState(false);

  const isBusy = notifBusy || locStatus === "detecting";

  // ── Navigate to Home (clear full stack) ────────────────────────────────────
  const goHome = useCallback(
    (stateName: string) => {
      stateStore.set(stateName);
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace({ pathname: "/home", params: { state: stateName } });
    },
    [],
  );


  // ── Navigate to State Picker (fallback) ────────────────────────────────────
  const goStatePicker = useCallback(
    (hint?: string) => {
      router.push({
        pathname: "/state-picker",
        params: { hint: hint ?? "Could not auto-detect state." },
      });
    },
    [],
  );

  // ── Step 0: Notification permission ────────────────────────────────────────
  const handleNotification = useCallback(async () => {
    setNotifBusy(true);
    try {
      await requestNotificationPermission();
    } finally {
      setNotifBusy(false);
      setStep(1); // always proceed regardless of result
    }
  }, []);

  // ── Step 1: Location permission + GPS pipeline ─────────────────────────────
  const handleLocation = useCallback(async () => {
    setLocStatus("detecting");
    setLocError(null);

    const result = await detectIndianState();

    if (result.success) {
      setLocStatus("success");
      setTimeout(() => goHome(result.state), 400); // brief success flash
    } else {
      setLocStatus("failed");
      setLocError({ reason: result.reason, message: result.message });
    }
  }, [goHome]);

  // ── Open device Settings (for permanently denied cases) ────────────────────
  const openSettings = useCallback(() => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────

  const card = step === 0 ? NOTIFICATION_CARD : LOCATION_CARD;

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      <StatusBar style="light" />

      {/* Progress dots */}
      <View style={styles.progressRow}>
        {[0, 1].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              i <= step ? styles.dotActive : styles.dotInactive,
              i === step && styles.dotCurrent,
            ]}
          />
        ))}
      </View>

      {/* Main card */}
      <View style={styles.card}>
        {/* Icon blob */}
        <View
          style={[
            styles.iconBlob,
            { backgroundColor: card.accentColor + "22" },
          ]}
        >
          <Ionicons name={card.icon as any} size={44} color={card.accentColor} />
        </View>

        <Text style={styles.title}>{card.title}</Text>
        <Text style={styles.description}>{card.description}</Text>

        {/* Bullet points */}
        <View style={styles.bulletList}>
          {card.bullets.map((b) => (
            <View key={b} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={18} color={card.accentColor} style={{ marginTop: 2 }} />
              <Text style={styles.bullet}>
                {b}
              </Text>
            </View>
          ))}
        </View>

        {/* Location error banner */}
        {locStatus === "failed" && locError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️  {locError.message}</Text>
            {locError.reason === "permissionPermanentlyDenied" && (
              <TouchableOpacity onPress={openSettings}>
                <Text style={styles.errorAction}>Open Settings →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* CTA button */}
      <TouchableOpacity
        style={[styles.btn, isBusy && styles.btnDisabled]}
        activeOpacity={0.8}
        disabled={isBusy}
        onPress={step === 0 ? handleNotification : handleLocation}
      >
        <LinearGradient
          colors={["#16A34A", "#15803D"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGradient}
        >
          {isBusy ? (
            <View style={styles.btnContent}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.btnText}>
                {locStatus === "detecting"
                  ? "Detecting location..."
                  : "Please wait..."}
              </Text>
            </View>
          ) : locStatus === "success" ? (
            <Text style={styles.btnText}>✓  State Detected!</Text>
          ) : (
            <Text style={styles.btnText}>{card.btnLabel}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Skip / manual link */}
      <TouchableOpacity
        style={styles.skipBtn}
        disabled={isBusy}
        onPress={
          step === 0
            ? () => setStep(1)
            : () => goStatePicker(locError?.message)
        }
      >
        <Text style={[styles.skipText, isBusy && { opacity: 0.4 }]}>
          {locStatus === "failed"
            ? "Select state manually →"
            : card.skipLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
  },

  // ── Progress ──────────────────────────────────────────────────────────────
  progressRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: "#16A34A",
  },
  dotInactive: {
    backgroundColor: "#D1D5DB",
    width: 24,
  },
  dotCurrent: {
    width: 40,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  iconBlob: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  bulletList: {
    alignSelf: "stretch",
    gap: 12,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bullet: {
    flex: 1,
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    fontWeight: "500",
  },

  // ── Error banner ─────────────────────────────────────────────────────────
  errorBanner: {
    marginTop: 20,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 14,
    width: "100%",
    gap: 8,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  errorAction: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
  },

  // ── CTA Button ────────────────────────────────────────────────────────────
  btn: {
    width: "100%",
    marginTop: 24,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },

  // ── Skip ──────────────────────────────────────────────────────────────────
  skipBtn: {
    marginTop: 16,
    padding: 8,
  },
  skipText: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
});

