import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: "#16A34A", text: "#FFFFFF" },
  preparing: { bg: "#FEF3C7", text: "#D97706" },
  packed:    { bg: "#DBEAFE", text: "#1D4ED8" },
  outForDelivery: { bg: "#EDE9FE", text: "#6D28D9" },
  delivered: { bg: "#F3F4F6", text: "#374151" },
  cancelled: { bg: "#FEE2E2", text: "#DC2626" },
};

const ACTIVE_STATUSES = new Set(["confirmed", "preparing", "packed", "outForDelivery"]);

function formatStatus(status: string) {
  if (status === "outForDelivery") return "Out For Delivery";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface OrderRow {
  id: string;
  orderId?: string;
  totalAmount?: number;
  total?: number;
  status?: string;
  createdAt?: any;
  estimatedDelivery?: any; // Firestore Timestamp or Date
  items?: unknown[];
}

function formatDate(value: any) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function toDate(value: any): Date | null {
  if (!value) return null;
  const d = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Per-card live countdown displayed on active orders. */
function DeliveryCountdown({ estimatedDelivery }: { estimatedDelivery: any }) {
  const eta = toDate(estimatedDelivery);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!eta) return;
    function tick() {
      const diff = eta!.getTime() - Date.now();
      if (diff <= 0) { setLabel("Arriving now"); return; }
      const mins = Math.ceil(diff / 60_000);
      const hrs  = Math.floor(mins / 60);
      const rem  = mins % 60;
      setLabel(hrs > 0 ? `${hrs}h ${rem}min away` : `${mins} min away`);
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!eta || !label) return null;

  const timeStr = eta.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <View style={styles.etaRow}>
      <View style={styles.etaDot} />
      <Text style={styles.etaText}>
        <Text style={styles.etaBold}>By {timeStr}</Text>  ·  {label}
      </Text>
    </View>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  const subscribe = useCallback(() => {
    const user = auth.currentUser;
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Real-time listener — auto-updates when admin or auto-confirm changes status
    const ref = collection(db, "orders");
    const q   = query(ref, where("userId", "==", user.uid), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrders(snap.docs.map((d) => {
          const data = d.data();
          return { id: d.id, ...data, status: data.status === "pending" ? "confirmed" : (data.status ?? "confirmed") } as OrderRow;
        }));
        setLoading(false);
        setRefreshing(false);
      },
      () => {
        // Fallback: index not ready — try without orderBy
        const q2   = query(ref, where("userId", "==", user.uid));
        const unsub2 = onSnapshot(q2, (snap) => {
          setOrders(snap.docs.map((d) => {
            const data = d.data();
            return { id: d.id, ...data, status: data.status === "pending" ? "confirmed" : (data.status ?? "confirmed") } as OrderRow;
          }));
          setLoading(false);
          setRefreshing(false);
        });
        unsubRef.current = unsub2;
      },
    );
    unsubRef.current = unsub;
  }, []);

  useEffect(() => {
    subscribe();
    return () => unsubRef.current?.(); // cleanup listener on unmount
  }, [subscribe]);

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); subscribe(); }} tintColor={PRIMARY} />}
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
            const total     = item.totalAmount ?? item.total ?? 0;
            const rawStatus = (item.status || "confirmed").toLowerCase();
            const statusLabel = formatStatus(item.status || "confirmed");
            const colors    = STATUS_COLORS[item.status || "confirmed"] ?? STATUS_COLORS.confirmed;
            const isActive  = ACTIVE_STATUSES.has(item.status || "confirmed");
            return (
              <Pressable style={styles.card} onPress={() => router.push(`/order-tracking/${item.id}` as any)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderId}>#{(item.orderId || item.id).slice(-8)}</Text>
                  <Text style={styles.meta}>{formatDate(item.createdAt)} · {(item.items || []).length} item(s)</Text>
                  {isActive && item.estimatedDelivery ? (
                    <DeliveryCountdown estimatedDelivery={item.estimatedDelivery} />
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={styles.total}>{formatRupees(total)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.statusText, { color: colors.text }]}>{statusLabel}</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <MainTabs active="orders" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: BG },
  header:     { backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  title:      { color: TEXT, fontSize: 24, fontWeight: "900" },
  subtitle:   { color: MUTED, fontSize: 13, marginTop: 3, fontWeight: "500" },
  center:     { alignItems: "center", justifyContent: "center", padding: 28, gap: 8 },
  emptyState: { alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  emptyTitle: { color: TEXT, fontSize: 17, fontWeight: "900" },
  emptyText:  { color: MUTED, fontSize: 13, textAlign: "center" },
  shopBtn:     { marginTop: 8, backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  shopBtnText: { color: "#FFFFFF", fontWeight: "900" },
  card:       { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", padding: 14 },
  orderId:    { color: TEXT, fontSize: 15, fontWeight: "900" },
  meta:       { color: MUTED, fontSize: 12, marginTop: 4, marginBottom: 6 },
  total:      { color: TEXT, fontSize: 15, fontWeight: "900" },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:  { fontSize: 11, fontWeight: "900" },

  // ETA row
  etaRow:  { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  etaDot:  { width: 7, height: 7, borderRadius: 3.5, backgroundColor: PRIMARY },
  etaText: { color: MUTED, fontSize: 11.5, fontWeight: "500" },
  etaBold: { fontWeight: "800", color: TEXT },
});
