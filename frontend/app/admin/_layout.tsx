// ─────────────────────────────────────────────────────────────────────────────
//  app/admin/_layout.tsx
//
//  Admin panel root layout.
//  - Checks user role via MongoDB JWT session
//  - Redirects to /login if role !== "admin" OR no user is signed in.
// ─────────────────────────────────────────────────────────────────────────────

import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { ROUTES } from "../../utils/routes";
import { api, getStoredUser } from "../../utils/api";

export default function AdminLayout() {
  const [checking, setChecking] = useState(true);
  const [isAdmin,  setIsAdmin]  = useState(false);

  useEffect(() => {
    async function checkRole() {
      try {
        const stored = await getStoredUser();
        if (stored?.role === "admin") {
          setIsAdmin(true);
          setChecking(false);
          return;
        }

        // Verify with MongoDB backend /api/auth/me
        const res = await api.get<{ success: boolean; user: any }>("/api/auth/me").catch(() => null);
        if (res?.user?.role === "admin") {
          setIsAdmin(true);
        } else {
          router.replace(ROUTES.login);
        }
      } catch {
        router.replace(ROUTES.login);
      } finally {
        setChecking(false);
      }
    }
    checkRole();
  }, []);

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.loadingText}>Verifying admin access...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="products" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="users" />
      <Stack.Screen name="cities" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
});
