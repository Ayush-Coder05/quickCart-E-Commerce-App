// ─────────────────────────────────────────────────────────────────────────────
//  app/_layout.tsx
//
//  Root navigation layout with MongoDB JWT session guard.
// ─────────────────────────────────────────────────────────────────────────────

import { requireOptionalNativeModule } from "expo";
import { Stack, router } from "expo-router";
import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ROUTES } from "../utils/routes";
import { getAuthToken, getStoredUser } from "../utils/api";

const DevMenuPreferences = requireOptionalNativeModule("DevMenuPreferences");

export default function RootLayout() {
  const authChecked = useRef(false);

  useEffect(() => {
    if (__DEV__) {
      DevMenuPreferences?.setPreferencesAsync({
        showFloatingActionButton: false,
        motionGestureEnabled: true,
        touchGestureEnabled: true,
        keyCommandsEnabled: true,
        showsAtLaunch: false,
      });
    }
  }, []);

  useEffect(() => {
    async function checkAuthSession() {
      if (authChecked.current) return;
      authChecked.current = true;

      const token = await getAuthToken();
      const storedUser = await getStoredUser();

      if (token && storedUser) {
        const savedState = await AsyncStorage.getItem("@quickcart_selected_state").catch(() => null);
        if (savedState) {
          router.replace(ROUTES.home);
        } else {
          router.replace(ROUTES.permissionFlow);
        }
      }
    }

    checkAuthSession();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index"            options={{ animation: "none" }} />
      <Stack.Screen name="splash"           options={{ animation: "none" }} />
      <Stack.Screen name="login"            options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="signup"           options={{ animation: "slide_from_right" }} />
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
      <Stack.Screen name="address"          options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="admin"            options={{ animation: "fade", gestureEnabled: false }} />
    </Stack>
  );
}
