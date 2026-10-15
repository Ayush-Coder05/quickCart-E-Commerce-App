import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MainTabs, MAIN_TABS_HEIGHT } from "../components/MainTabs";
import { logoutUser } from "../utils/auth";
import { ROUTES } from "../utils/routes";
import { stateStore } from "../utils/stateStore";
import { getStoredUser, api } from "../utils/api";

const PRIMARY = "#16A34A";
const BG = "#F3F4F6";
const TEXT = "#1F2937";
const MUTED = "#6B7280";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<string>("");
  const [name, setName] = useState<string>("QuickCart user");
  const [email, setEmail] = useState<string>("");
  const [selectedState, setSelectedState] = useState(stateStore.current);

  useEffect(() => stateStore.subscribe(setSelectedState), []);

  useEffect(() => {
    async function loadProfile() {
      const stored = await getStoredUser();
      if (stored) {
        if (stored.role) setRole(stored.role);
        if (stored.fullName) setName(stored.fullName);
        if (stored.email) setEmail(stored.email);
      }
      try {
        const res = await api.get<{ success: boolean; user: any }>("/api/auth/me");
        if (res?.user) {
          if (res.user.role) setRole(res.user.role);
          if (res.user.fullName) setName(res.user.fullName);
          if (res.user.email) setEmail(res.user.email);
        }
      } catch {}
    }
    loadProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert("Sign out", "Do you want to sign out of QuickCart?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logoutUser();
          await stateStore.clear();
          router.replace(ROUTES.login);
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: MAIN_TABS_HEIGHT + insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Account, delivery region, and admin access.</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(name || "QC").slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.email}>{email || "Not signed in"}</Text>
          </View>
        </View>

        <Pressable style={styles.row} onPress={() => router.push(ROUTES.statePicker)}>
          <Ionicons name="location-outline" size={22} color={PRIMARY} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Delivery State</Text>
            <Text style={styles.rowSub}>{selectedState || "Choose your delivery state"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={MUTED} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => router.push(ROUTES.address)}>
          <Ionicons name="home-outline" size={22} color={PRIMARY} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Saved Address</Text>
            <Text style={styles.rowSub}>Manage delivery address</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={MUTED} />
        </Pressable>

        {role === "admin" ? (
          <Pressable style={styles.adminBtn} onPress={() => router.push(ROUTES.adminDashboard)}>
            <Ionicons name="speedometer-outline" size={20} color="#FFFFFF" />
            <Text style={styles.adminText}>Open Admin Dashboard</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </View>

      <MainTabs active="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: { backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  title: { color: TEXT, fontSize: 24, fontWeight: "900" },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 3, fontWeight: "500" },
  content: { padding: 16, gap: 12 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", padding: 16 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  avatarText: { color: PRIMARY, fontSize: 19, fontWeight: "900" },
  name: { color: TEXT, fontSize: 17, fontWeight: "900" },
  email: { color: MUTED, fontSize: 13, marginTop: 3 },
  row: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 14 },
  rowTitle: { color: TEXT, fontSize: 14, fontWeight: "900" },
  rowSub: { color: MUTED, fontSize: 12, marginTop: 2 },
  adminBtn: { height: 50, borderRadius: 12, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  adminText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  logoutBtn: { height: 50, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#FECACA", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  logoutText: { color: "#DC2626", fontSize: 14, fontWeight: "900" },
});
