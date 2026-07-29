// ─────────────────────────────────────────────────────────────────────────────
//  app/admin/orders.tsx
//
//  Admin Orders screen — search, filter by status, order detail modal,
//  controlled status transition updates with proper address formatting.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import { AdminHeader } from "../../components/admin/AdminHeader";
import { AdminDrawer } from "../../components/admin/AdminDrawer";
import { formatRupees } from "../../utils/currency";
import { canUpdateOrderStatus, ORDER_STATUS_FLOW, OrderStatus } from "../../utils/orderStatus";

const PRIMARY = "#16A34A";
const BG      = "#F3F4F6";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#16A34A",
  preparing: "#F59E0B",
  packed:    "#8B5CF6",
  outForDelivery: "#6366F1",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

const STATUS_LABELS = ["All", "confirmed", "preparing", "packed", "outForDelivery", "delivered", "cancelled"];

function formatStatus(status: string) {
  if (status === "outForDelivery") return "Out For Delivery";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Human-readable address field labels
const ADDRESS_LABELS: Record<string, string> = {
  fullName:  "Name",
  name:      "Name",
  line1:     "Address",
  line2:     "Apt/Suite",
  address:   "Address",
  street:    "Street",
  city:      "City",
  state:     "State",
  pincode:   "PIN",
  zip:       "ZIP",
  country:   "Country",
  phone:     "Phone",
  mobile:    "Mobile",
};

function formatAddressKey(key: string): string {
  return ADDRESS_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

interface Order {
  id:              string;
  userId:          string;
  items:           { title: string; quantity: number; price: number }[];
  total:           number;
  status:          string;
  deliveryAddress: Record<string, string>;
  createdAt:       Date;
  cancelledBy?:    string;
  cancelledAt?:    Date;
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [orders,        setOrders]        = useState<Order[]>([]);
  const [filtered,      setFiltered]      = useState<Order[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("All");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating,      setUpdating]      = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(100)),
      );
      setOrders(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id:              d.id,
            userId:          data.userId          ?? "",
            items:           data.items           ?? [],
            total:           data.total           ?? 0,
            status:          data.status === "pending" ? "confirmed" : (data.status ?? "confirmed"),
            deliveryAddress: data.deliveryAddress ?? {},
            createdAt:       data.createdAt?.toDate?.() ?? new Date(),
            cancelledBy:     data.cancelledBy,
            cancelledAt:     data.cancelledAt?.toDate?.(),
          };
        }),
      );
    } catch {
      Alert.alert("Error", "Could not load orders.");
    }
  }, []);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    await fetchAll();
    setLoading(false); setRefreshing(false);
  }, [fetchAll]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      orders.filter((o) => {
        const statusOk = statusFilter === "All" || o.status === statusFilter;
        const searchOk =
          !q ||
          o.id.toLowerCase().includes(q) ||
          o.userId.toLowerCase().includes(q) ||
          (o.deliveryAddress?.city ?? "").toLowerCase().includes(q);
        return statusOk && searchOk;
      }),
    );
  }, [search, statusFilter, orders]);

  const handleStatusUpdate = async (order: Order, newStatus: string) => {
    if (!canUpdateOrderStatus(order.status as OrderStatus, newStatus as OrderStatus)) {
      Alert.alert("Invalid transition", "Orders can only move to the next stage or be cancelled.");
      return;
    }
    if (order.status === newStatus) return;
    try {
      setUpdating(true);
      await updateDoc(doc(db, "orders", order.id), {
        status:    newStatus,
        updatedAt: serverTimestamp(),
        [`${newStatus}At`]: serverTimestamp(),
      });
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      await load();
    } catch {
      Alert.alert("Error", "Could not update order status.");
    } finally {
      setUpdating(false);
    }
  };

  const renderItem = ({ item }: { item: Order }) => (
    <Pressable onPress={() => setSelectedOrder(item)} style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.orderId}>#{item.id.slice(-8).toUpperCase()}</Text>
        <Text style={styles.orderMeta}>
          {item.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          {item.deliveryAddress?.city ? `  ·  ${item.deliveryAddress.city}` : ""}
        </Text>
        <Text style={styles.orderMeta}>{item.items.length} item{item.items.length !== 1 ? "s" : ""}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.orderTotal}>{formatRupees(item.total)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] ?? "#9CA3AF") + "22" }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] ?? "#9CA3AF" }]}>
            {formatStatus(item.status)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={{ marginLeft: 4 }} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
      <AdminHeader title="Orders" onMenuPress={() => setDrawerOpen(true)} />

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by order ID or city..."
          placeholderTextColor="#9CA3AF"
        />
        {search ? (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        ) : null}
      </View>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      >
        {STATUS_LABELS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setStatusFilter(s)}
            style={[
              styles.filterChip,
              statusFilter === s && {
                backgroundColor: s === "All" ? PRIMARY : STATUS_COLORS[s] ?? PRIMARY,
              },
            ]}
          >
            <Text style={[styles.filterText, statusFilter === s && { color: "#fff" }]}>{formatStatus(s)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={PRIMARY} />}
          removeClippedSubviews
          windowSize={10}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No orders found.</Text>
            </View>
          }
        />
      )}

      {/* ── Order Detail Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelectedOrder(null)} />
          <View style={[styles.detailSheet, { paddingBottom: insets.bottom }]}>
            {/* Modal header */}
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.detailTitle}>
                  Order #{selectedOrder?.id.slice(-8).toUpperCase()}
                </Text>
                <Text style={styles.detailDate}>
                  {selectedOrder?.createdAt.toLocaleDateString("en-IN", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedOrder(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#374151" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
              {/* Status update */}
              <Text style={styles.detailSection}>Update Status</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {ORDER_STATUS_FLOW.map((s) => {
                  const canTransit = canUpdateOrderStatus(
                    (selectedOrder?.status ?? "cancelled") as OrderStatus,
                    s as OrderStatus,
                  );
                  const isActive = selectedOrder?.status === s;
                  return (
                    <Pressable
                      key={s}
                      disabled={updating || !canTransit}
                      onPress={() => selectedOrder && handleStatusUpdate(selectedOrder, s)}
                      style={[
                        styles.statusChip,
                        isActive && { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] },
                        !canTransit && styles.statusChipDisabled,
                      ]}
                    >
                      {isActive && (
                        <Ionicons name="checkmark-circle" size={13} color="#fff" style={{ marginRight: 4 }} />
                      )}
                      <Text style={[styles.statusChipText, isActive && { color: "#fff" }]}>{formatStatus(s)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {updating && <ActivityIndicator size="small" color={PRIMARY} style={{ marginTop: 8 }} />}

              {/* Delivery address — formatted labels */}
              <Text style={[styles.detailSection, { marginTop: 20 }]}>Delivery Address</Text>
              {selectedOrder?.deliveryAddress && Object.keys(selectedOrder.deliveryAddress).length > 0 ? (
                <View style={styles.addressCard}>
                  {Object.entries(selectedOrder.deliveryAddress)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <View key={k} style={styles.addressRow}>
                        <Text style={styles.addressLabel}>{formatAddressKey(k)}</Text>
                        <Text style={styles.addressValue}>{v}</Text>
                      </View>
                    ))}
                </View>
              ) : (
                <Text style={styles.detailMuted}>No address saved.</Text>
              )}

              {/* Cancellation Details */}
              {selectedOrder?.status === "cancelled" && (
                <>
                  <Text style={[styles.detailSection, { marginTop: 20 }]}>Cancellation Details</Text>
                  <View style={styles.addressCard}>
                    <View style={styles.addressRow}>
                      <Text style={styles.addressLabel}>Cancelled By</Text>
                      <Text style={styles.addressValue}>{selectedOrder.cancelledBy === "customer" ? "Customer" : (selectedOrder.cancelledBy || "Unknown")}</Text>
                    </View>
                    {selectedOrder.cancelledAt && (
                      <View style={styles.addressRow}>
                        <Text style={styles.addressLabel}>Cancelled At</Text>
                        <Text style={styles.addressValue}>
                          {selectedOrder.cancelledAt.toLocaleString("en-IN")}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* Items */}
              <Text style={[styles.detailSection, { marginTop: 20 }]}>Items</Text>
              <View style={styles.itemsCard}>
                {(selectedOrder?.items ?? []).map((item, i) => (
                  <View key={i} style={[styles.itemRow, i > 0 && styles.itemRowBorder]}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.itemQty}>×{item.quantity}</Text>
                    <Text style={styles.itemPrice}>{formatRupees(item.price * item.quantity)}</Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatRupees(selectedOrder?.total ?? 0)}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AdminDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} activeRoute="/admin/orders" />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar:  {
    flexDirection: "row", alignItems: "center", gap: 8,
    margin: 16, backgroundColor: "#fff", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1F2937" },
  filterRow:   {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 4,
    marginTop: 4,
  },
  filterChip:  {
    height: 42,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 21,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  filterText: { fontSize: 12, fontWeight: "700", color: "#374151", textTransform: "capitalize" },

  loadingBox:  { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: "#6B7280", fontSize: 14 },
  list:        { paddingHorizontal: 16 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  orderId:    { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  orderMeta:  { fontSize: 12, color: "#6B7280", marginTop: 2 },
  orderTotal: { fontSize: 14, fontWeight: "800", color: "#1F2937", marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText:  { fontSize: 11, fontWeight: "700" },
  emptyBox:   { padding: 40, alignItems: "center", gap: 12 },
  emptyText:  { color: "#9CA3AF", fontSize: 14 },

  // Detail modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  detailSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  detailHeader: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    padding: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  detailTitle: { fontSize: 16, fontWeight: "800", color: "#1F2937" },
  detailDate:  { fontSize: 12, color: "#6B7280", marginTop: 2 },
  closeBtn:    { padding: 4 },
  detailBody:  { padding: 20 },

  detailSection: {
    fontSize: 12, fontWeight: "700", color: "#6B7280",
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10,
  },
  detailMuted: { fontSize: 13, color: "#9CA3AF" },

  // Status chips
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1.5,
    borderColor: "#E5E7EB", backgroundColor: "#F9FAFB",
  },
  statusChipText:     { fontSize: 12, fontWeight: "700", color: "#374151" },
  statusChipDisabled: { opacity: 0.35 },

  // Address
  addressCard: {
    backgroundColor: "#F9FAFB", borderRadius: 10,
    borderWidth: 1, borderColor: "#E5E7EB",
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addressRow:   { flexDirection: "row", paddingVertical: 6, gap: 8 },
  addressLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", width: 70 },
  addressValue: { flex: 1, fontSize: 13, color: "#1F2937" },

  // Items
  itemsCard: {
    backgroundColor: "#F9FAFB", borderRadius: 10,
    borderWidth: 1, borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  itemRow:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  itemName:  { flex: 1, fontSize: 13, color: "#1F2937" },
  itemQty:   { fontSize: 13, color: "#6B7280", marginHorizontal: 8 },
  itemPrice: { fontSize: 13, fontWeight: "700", color: "#1F2937" },
  totalRow:  {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 2, borderTopColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#374151" },
  totalValue: { fontSize: 16, fontWeight: "900", color: "#1F2937" },
});

