//  app/admin/dashboard.tsx
//
//  Admin dashboard - MongoDB FastAPI metrics + recent orders + low stock

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

import { api } from "../../utils/api";
import { AdminHeader } from "../../components/admin/AdminHeader";
import { AdminDrawer } from "../../components/admin/AdminDrawer";
import { StatCard } from "../../components/admin/StatCard";
import { formatRupees } from "../../utils/currency";

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
  confirmed: "#16A34A",
  preparing: "#F59E0B",
  packed:    "#8B5CF6",
  outForDelivery: "#6366F1",
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
      const res = await api.get<{
        success: boolean;
        stats: DashboardStats;
        recentOrders: any[];
        lowStockItems: any[];
      }>("/api/orders/stats");

      if (res?.success) {
        setStats(res.stats);
        if (Array.isArray(res.recentOrders)) {
          setRecentOrders(
            res.recentOrders.map((o) => ({
              id:        o.orderId || o.id || o._id,
              userId:    o.userId || "",
              total:     o.total || 0,
              status:    o.status || "confirmed",
              createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
              city:      o.deliveryAddress?.city,
            }))
          );
        }
        if (Array.isArray(res.lowStockItems)) {
          setLowStock(
            res.lowStockItems.map((item) => ({
              id:    item.id || item._id,
              name:  item.title || item.name || "Unknown",
              stock: Number(item.stock ?? 0),
              state: item.stateName || item.state || "",
            }))
          );
        }
      }
    } catch (err: any) {
      console.warn("Dashboard fetch error from MongoDB:", err);
      setFetchError("Unable to load dashboard statistics.\nPlease check server connection.");
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
          <StatCard icon="time-outline"      label="Active Orders"  value={stats?.pendingOrders ?? 0} color="#EF4444" loading={loading} />
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
