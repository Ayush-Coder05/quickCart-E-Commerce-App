// ─────────────────────────────────────────────────────────────────────────────
//  app/admin/_layout.tsx
//
//  Admin panel root layout.
//  - Reads the current user's Firestore `role` field on mount.
//  - Redirects to /login if role !== "admin" OR no user is signed in.
//  - Renders a Stack with header hidden - each admin screen manages its own
//    header via AdminHeader + AdminDrawer components.
//  - Security is also enforced in Firestore Security Rules (isAdmin() function)
//    - navigation-level guard here is UX only.
// ─────────────────────────────────────────────────────────────────────────────

import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../utils/firebase";
import { ROUTES } from "../../utils/routes";

export default function AdminLayout() {
  const [checking, setChecking] = useState(true);
  const [isAdmin,  setIsAdmin]  = useState(false);

  useEffect(() => {
    async function checkRole() {
      const user = auth.currentUser;
      if (!user) {
        router.replace(ROUTES.login);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().role === "admin") {
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

  if (!isAdmin) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index"      options={{ animation: "none" }} />
      <Stack.Screen name="dashboard"  options={{ animation: "none" }} />
      <Stack.Screen name="categories" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="products"   options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="cities"     options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="orders"     options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="users"      options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F3F4F6", gap: 16 },
  loadingText: { color: "#6B7280", fontSize: 14 },
});


