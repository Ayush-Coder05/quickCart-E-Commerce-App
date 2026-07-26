//  app/admin/dashboard.tsx
//
//  Admin dashboard - Firestore-driven metrics + recent orders + low stock

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  getCountFromServer,
  getAggregateFromServer,
  sum,
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import { AdminHeader } from "../../components/admin/AdminHeader";
import { AdminDrawer } from "../../components/admin/AdminDrawer";
import { StatCard } from "../../components/admin/StatCard";
import { formatRupees } from "../../utils/currency";
import { INDIAN_STATES } from "../../utils/indianStates";

const BG = "#F3F4F6";

interface DashboardStats {
  totalUsers:     number;
  totalOrders:    number;
  deliveredRev:   number;
  availableItems: number;
  pendingOrders:  number;
}

interface RecentOrder {
  id:        string;
  userId:    string;
  total:     number;
  status:    string;
  createdAt: Date;
  city?:     string;
}

interface LowStockItem {
  id:    string;
  name:  string;
  stock: number;
  state: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "#F59E0B",
  confirmed: "#3B82F6",
  packed:    "#8B5CF6",
  shipped:   "#6366F1",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [stats,      setStats]      = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStock,     setLowStock]     = useState<LowStockItem[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // ── 1. Aggregate stats (4 requests, all parallel — safe) ──────────────
      const fetchRevenue = async () => {
        try {
          const revSnap = await getAggregateFromServer(query(collection(db, "orders"), where("status", "==", "delivered")), {
            totalRevenue: sum('total')
          });
          return revSnap.data().totalRevenue || 0;
        } catch (e) {
          console.warn("fetchRevenue aggregation failed:", e);
          return 0; // Fallback to 0 to prevent massive quota usage from full collection reads
        }
      };

      const safeCount = async (q: any) => {
        try {
          const snap = await getCountFromServer(q);
          return snap.data().count;
        } catch (e) {
          console.warn("safeCount aggregation failed:", e);
          return 0; // Fallback to 0 to prevent massive quota usage from full collection reads
        }
      };

      const [usersCount, ordersCount, pendingOrders, deliveredRev] = await Promise.all([
        safeCount(collection(db, "users")),
        safeCount(collection(db, "orders")),
        safeCount(query(collection(db, "orders"), where("status", "in", ["pending", "confirmed", "packed", "shipped"]))),
        fetchRevenue()
      ]);

      // ── 2. Available items — single root-products count (no per-state fan-out) ──
      const availableItems = await safeCount(
        query(collection(db, "products"), where("availability", "==", "available"))
      );

      setStats({
        totalUsers:     usersCount,
        totalOrders:    ordersCount,
        deliveredRev,
        availableItems,
        pendingOrders,
      });

      // ── 3. Recent orders — single query ──────────────────────────────────
      const recentSnap = await getDocs(
        query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(10)),
      );
      setRecentOrders(
        recentSnap.docs.map((d) => {
          const data = d.data();
          return {
            id:        d.id,
            userId:    data.userId ?? "",
            total:     data.total  ?? 0,
            status:    data.status ?? "pending",
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            city:      data.deliveryAddress?.city,
          };
        }),
      );

      // ── 4. Low-stock: fan-out over states in chunks of 5 ─────────────────
      //    (avoids firing 36 simultaneous requests → quota exceeded)
      const CHUNK = 5;
      const lowItems: LowStockItem[] = [];

      for (let i = 0; i < INDIAN_STATES.length && lowItems.length < 10; i += CHUNK) {
        const chunk = INDIAN_STATES.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map(async (stateName) => {
            try {
              const lsSnap = await getDocs(
                query(
                  collection(db, "states", stateName, "products"),
                  where("stock", "<=", 10),
                  orderBy("stock"),
                  limit(5),
                ),
              );
              lsSnap.docs.forEach((d) => {
                const data = d.data();
                lowItems.push({
                  id:    d.id,
                  name:  data.name || data.title || "Unknown",
                  stock: data.stock ?? 0,
                  state: stateName,
                });
              });
            } catch {
              // skip states that don't exist in Firestore yet
            }
          }),
        );
      }

      // Fallback to root /products collection if no state-level data found
      if (lowItems.length === 0) {
        const rootProductsSnap = await getDocs(query(collection(db, "products"), limit(50)));
        rootProductsSnap.docs.forEach((d) => {
          const data  = d.data();
          const stock = Number(data.stock ?? 0);
          if (stock <= 10) {
            lowItems.push({
              id:    d.id,
              name:  data.name || data.title || "Unknown",
              stock,
              state: data.stateName || data.state || data.stateId || "",
            });
          }
        });
      }

      setLowStock(lowItems.slice(0, 10));
    } catch (err: any) {
      console.warn("Dashboard fetch error:", err);
      setFetchError("Unable to load dashboard statistics.\nPlease try again later.");
    }
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setFetchError(null);
    await fetchData();
    setLoading(false);
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#16A34A" />
      <AdminHeader title="Dashboard" onMenuPress={() => setDrawerOpen(true)} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#16A34A" />}
      >
        {fetchError && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={16} color="#92400E" style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText} numberOfLines={2}>{fetchError}</Text>
            <Pressable onPress={() => load()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="people-outline"    label="Total Users"    value={stats?.totalUsers     ?? 0} color="#16A34A" loading={loading} />
          <StatCard icon="receipt-outline"   label="Total Orders"   value={stats?.totalOrders    ?? 0} color="#3B82F6" loading={loading} />
        </View>
        <View style={styles.statsGrid}>
          <StatCard icon="cash-outline"      label="Revenue (Delivered)" value={loading ? "..." : formatRupees(stats?.deliveredRev ?? 0)} color="#10B981" loading={false} />
          <StatCard icon="cube-outline"      label="Available Items" value={stats?.availableItems ?? 0} color="#F59E0B" loading={loading} />
        </View>
        <View style={styles.statsGrid}>
          <StatCard icon="time-outline"      label="Pending Orders"  value={stats?.pendingOrders ?? 0} color="#EF4444" loading={loading} />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent Orders</Text>
        {loading ? (
          <ActivityIndicator color="#16A34A" style={{ marginTop: 16 }} />
        ) : recentOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={32} color="#D1D5DB" />
            <Text style={styles.emptyText}>No orders yet.</Text>
          </View>
        ) : (
          recentOrders.map((order) => (
            <View key={order.id} style={styles.orderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderId} numberOfLines={1}>#{order.id.slice(-8).toUpperCase()}</Text>
                <Text style={styles.orderMeta}>
                  {order.createdAt.toLocaleDateString("en-IN")}
                  {order.city ? `  -  ${order.city}` : ""}
                </Text>
              </View>
              <Text style={styles.orderTotal}>{formatRupees(order.total)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[order.status] ?? "#6B7280") + "22" }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] ?? "#6B7280" }]}>
                  {order.status}
                </Text>
              </View>
            </View>
          ))
        )}

        {lowStock.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Low Stock Items</Text>
            {lowStock.map((item) => (
              <View key={`${item.state}-${item.id}`} style={styles.lowStockRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lowStockName}>{item.name}</Text>
                  <Text style={styles.lowStockState}>{item.state}</Text>
                </View>
                <View style={styles.stockBadge}>
                  <Text style={styles.stockBadgeText}>{item.stock} left</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <AdminDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} activeRoute="/admin/dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: BG },
  content: { padding: 16 },

  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 },
  statsGrid:    { flexDirection: "row", gap: 12, marginBottom: 12 },

  emptyBox:  { padding: 20, backgroundColor: "#fff", borderRadius: 12, alignItems: "center", gap: 8 },
  emptyText: { color: "#9CA3AF", fontSize: 14, marginTop: 4 },

  errorBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FEF3C7", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
    borderWidth: 1, borderColor: "#FCD34D",
  },
  errorBannerText: { flex: 1, fontSize: 13, color: "#92400E", fontWeight: "500" },
  retryBtn: { marginLeft: 8, backgroundColor: "#F59E0B", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  retryText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  orderRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 8,
  },
  orderId:    { fontSize: 13, fontWeight: "700", color: "#1F2937" },
  orderMeta:  { fontSize: 12, color: "#6B7280", marginTop: 2 },
  orderTotal: { fontSize: 14, fontWeight: "800", color: "#1F2937", marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText:  { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },

  lowStockRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 8,
  },
  lowStockName:  { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  lowStockState: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  stockBadge:     { backgroundColor: "#FEF2F2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  stockBadgeText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },
});


