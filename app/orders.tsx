import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MainTabs, MAIN_TABS_HEIGHT } from "../components/MainTabs";
import { formatRupees } from "../utils/currency";
import { auth, db } from "../utils/firebase";
import { ROUTES } from "../utils/routes";

const PRIMARY = "#16A34A";
const BG = "#F3F4F6";
const TEXT = "#1F2937";
const MUTED = "#6B7280";

interface OrderRow {
  id: string;
  orderId?: string;
  totalAmount?: number;
  total?: number;
  status?: string;
  createdAt?: any;
  items?: unknown[];
}

function formatDate(value: any) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      const ref = collection(db, "orders");
      const q = query(ref, where("uid", "==", user.uid), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setOrders(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as OrderRow)));
    } catch {
      const ref = collection(db, "orders");
      const snap = await getDocs(query(ref, where("userId", "==", auth.currentUser?.uid || "")));
      setOrders(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as OrderRow)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>Track current and previous purchases.</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PRIMARY} />
          <Text style={styles.emptyText}>Loading your orders...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: MAIN_TABS_HEIGHT + insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }} tintColor={PRIMARY} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>Your placed orders will appear here.</Text>
              <Pressable style={styles.shopBtn} onPress={() => router.replace(ROUTES.home)}>
                <Text style={styles.shopBtnText}>Start Shopping</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const total = item.totalAmount ?? item.total ?? 0;
            const status = item.status || "Pending";
            return (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderId}>#{(item.orderId || item.id).slice(-8)}</Text>
                  <Text style={styles.meta}>{formatDate(item.createdAt)} • {(item.items || []).length} item(s)</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={styles.total}>{formatRupees(total)}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{status}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <MainTabs active="orders" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: { backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  title: { color: TEXT, fontSize: 24, fontWeight: "900" },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 3, fontWeight: "500" },
  center: { alignItems: "center", justifyContent: "center", padding: 28, gap: 8 },
  emptyState: { alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  emptyTitle: { color: TEXT, fontSize: 17, fontWeight: "900" },
  emptyText: { color: MUTED, fontSize: 13, textAlign: "center" },
  shopBtn: { marginTop: 8, backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  shopBtnText: { color: "#FFFFFF", fontWeight: "900" },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", padding: 14 },
  orderId: { color: TEXT, fontSize: 15, fontWeight: "900" },
  meta: { color: MUTED, fontSize: 12, marginTop: 4 },
  total: { color: TEXT, fontSize: 15, fontWeight: "900" },
  statusBadge: { backgroundColor: "#DCFCE7", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: PRIMARY, fontSize: 11, fontWeight: "900" },
});
