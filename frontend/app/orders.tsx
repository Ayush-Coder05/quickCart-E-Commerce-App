import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { ROUTES } from "../utils/routes";
import { getMyOrders } from "../services/orderService";

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
  estimatedDelivery?: any;
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

  const loadOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const apiOrders = await getMyOrders();
      if (apiOrders && Array.isArray(apiOrders)) {
        setOrders(
          apiOrders.map((o: any) => ({
            id: o.orderId || o.id || o._id,
            orderId: o.orderId,
            total: o.total,
            status: o.status === "pending" ? "confirmed" : (o.status ?? "confirmed"),
            createdAt: o.createdAt,
            estimatedDelivery: o.estimatedDelivery,
            items: o.items,
          }))
        );
      }
    } catch (err) {
      console.warn("Error loading orders from MongoDB:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const timer = setInterval(() => {
      loadOrders();
    }, 10000);
    return () => clearInterval(timer);
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
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: MAIN_TABS_HEIGHT + insets.bottom + 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadOrders(true)}
              tintColor={PRIMARY}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={42} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyText}>Items you order will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusKey = item.status || "confirmed";
            const badge = STATUS_COLORS[statusKey] || STATUS_COLORS.confirmed;
            const itemCount = Array.isArray(item.items) ? item.items.length : undefined;
            const isActive = ACTIVE_STATUSES.has(statusKey);

            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/order-tracking/${item.id}` as any)}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderNumber}>#{item.id.slice(-8).toUpperCase()}</Text>
                    <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.text }]}>
                      {formatStatus(statusKey)}
                    </Text>
                  </View>
                </View>

                {/* Live delivery countdown for active orders */}
                {isActive && item.estimatedDelivery ? (
                  <DeliveryCountdown estimatedDelivery={item.estimatedDelivery} />
                ) : null}

                <View style={styles.cardBottom}>
                  <Text style={styles.amountText}>{formatRupees(item.total ?? item.totalAmount ?? 0)}</Text>
                  <View style={styles.trackRow}>
                    {itemCount !== undefined ? (
                      <Text style={styles.itemCountText}>
                        {itemCount} {itemCount === 1 ? "item" : "items"}  ·  
                      </Text>
                    ) : null}
                    <Text style={styles.trackText}>Track Order</Text>
                    <Ionicons name="chevron-forward" size={14} color={PRIMARY} />
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
  screen: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 22, fontWeight: "800", color: TEXT },
  subtitle: { fontSize: 13, color: MUTED, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  orderNumber: { fontSize: 15, fontWeight: "700", color: TEXT },
  dateText: { fontSize: 12, color: MUTED, marginTop: 3 },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
    gap: 6,
  },
  etaDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  etaText: { fontSize: 12, color: "#15803D" },
  etaBold: { fontWeight: "700" },
  cardBottom: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  amountText: { fontSize: 15, fontWeight: "800", color: TEXT },
  trackRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  itemCountText: { fontSize: 12, color: MUTED },
  trackText: { fontSize: 13, fontWeight: "600", color: PRIMARY },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: TEXT },
  emptyText: { fontSize: 13, color: MUTED },
});
