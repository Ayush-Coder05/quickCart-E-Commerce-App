// ─────────────────────────────────────────────────────────────────────────────
//  app/_layout.tsx
//
//  Root navigation layout with Firebase Auth session guard.
//
//  Rules:
//    - On app mount, if a user is already signed in to Firebase Auth,
//      they are redirected away from auth screens (login/signup/otp).
//    - After login or OTP verification, router.replace() resets the stack
//      so back button cannot return to auth screens.
//    - On logout, Firebase Auth state change fires → app resets to /login.
//    - gestureEnabled: false on auth/post-auth screens prevents swipe-back.
//    - Admin screens live under app/admin/ - their own _layout handles the
//      role check; this layout just registers the group so Expo Router finds it.
// ─────────────────────────────────────────────────────────────────────────────

import { Stack, router } from "expo-router";
import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../utils/firebase";
import { ROUTES } from "../utils/routes";

export default function RootLayout() {
  const authChecked       = useRef(false);
  const previousUserRef   = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      const currentUid = user?.uid ?? null;
      const prevUid    = previousUserRef.current;
      previousUserRef.current = currentUid;

      if (!authChecked.current) {
        // ── First auth check on mount ──────────────────────────────────
        authChecked.current = true;

        if (user) {
          // Already logged in - check if a state has been picked before
          const savedState = await AsyncStorage.getItem("@quickcart_selected_state").catch(() => null);
          if (savedState) {
            router.replace(ROUTES.home);
          } else {
            router.replace(ROUTES.permissionFlow);
          }
        }
        // If no user, let the normal index/splash/login flow run
        return;
      }

      // ── Logout detected - previous user existed, now null ─────────────
      if (prevUid && !currentUid) {
        router.replace(ROUTES.login);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index"            options={{ animation: "none" }} />
      <Stack.Screen name="splash"           options={{ animation: "none" }} />
      {/* gestureEnabled: false on login so swipe-back from home doesn't land here */}
      <Stack.Screen name="login"            options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="signup"           options={{ animation: "slide_from_right" }} />
      {/* gestureEnabled: false - cannot swipe back to signup after OTP screen */}
      <Stack.Screen name="otp-verification" options={{ animation: "slide_from_right", gestureEnabled: false }} />
      <Stack.Screen name="forgot-password"  options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="permission-flow"  options={{ animation: "fade",  gestureEnabled: false }} />
      <Stack.Screen name="state-picker"     options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
      <Stack.Screen name="home"             options={{ animation: "fade",  gestureEnabled: false }} />
      <Stack.Screen name="search"           options={{ animation: "fade",  gestureEnabled: false }} />
      <Stack.Screen name="orders"           options={{ animation: "fade",  gestureEnabled: false }} />
      <Stack.Screen name="profile"          options={{ animation: "fade",  gestureEnabled: false }} />
      <Stack.Screen name="cart"             options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="checkout"         options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="product/[id]"     options={{ animation: "slide_from_right" }} />
      {/* ── Address screen ────────────────────────────────────────────── */}
      <Stack.Screen name="address"          options={{ animation: "slide_from_bottom" }} />
      {/* ── Admin panel - child screens handled by app/admin/_layout.tsx  */}
      <Stack.Screen name="admin"            options={{ animation: "fade", gestureEnabled: false }} />
    </Stack>
  );
}



