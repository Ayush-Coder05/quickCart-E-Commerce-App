import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, StatusBar, Pressable, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../utils/api";
import { ORDER_STATUS_FLOW, OrderStatus } from "../../utils/orderStatus";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

const PRIMARY = "#16A34A";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";
const GRAY_LIGHT = "#E5E7EB";
const BG_COLOR = "#F3F4F6";

const STATUS_DETAILS: Record<OrderStatus, { title: string; desc: string }> = {
  confirmed: { title: "Order Confirmed", desc: "Your order has been confirmed." },
  preparing: { title: "Preparing", desc: "Your order is being prepared." },
  packed: { title: "Packed", desc: "Your order has been packed." },
  outForDelivery: { title: "Out For Delivery", desc: "Your order is on the way." },
  delivered: { title: "Delivered", desc: "Your order has been delivered." },
  cancelled: { title: "Order Cancelled", desc: "Your order has been cancelled." },
};

function formatDateTime(timestamp: any) {
  if (!timestamp) return null;
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(d.getTime())) return null;
  const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${dateStr} - ${timeStr}`;
}

export default function OrderTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [helpVisible, setHelpVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [addressVisible, setAddressVisible] = useState(false);

  // Form States
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const fetchOrder = useCallback(async () => {
    if (!id || typeof id !== "string") return;
    try {
      const res = await api.get<{ success: boolean; order: any }>(`/api/orders/${id}`);
      if (res?.order) {
        const data = res.order;
        setOrder(data);
        if (data.phone) setNewPhone(data.phone);
        else if (data.deliveryAddress?.phone) setNewPhone(data.deliveryAddress.phone);

        if (data.address) setNewAddress(data.address);
        else if (data.deliveryAddress) setNewAddress([data.deliveryAddress.houseFlat, data.deliveryAddress.streetArea, data.deliveryAddress.city, data.deliveryAddress.state, data.deliveryAddress.postalCode].filter(Boolean).join(", "));
      }
    } catch (e) {
      console.warn("Error fetching order from MongoDB:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: TEXT_MUTED }}>Order not found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12, padding: 12 }}>
          <Text style={{ color: PRIMARY, fontWeight: "bold" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const rawStatus = order.status === "pending" ? "confirmed" : order.status;
  const currentStatus = (rawStatus || "confirmed") as OrderStatus;
  const isCancelled = currentStatus === "cancelled";
  const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);

  const canEditOrCancel = ["confirmed", "preparing", "packed"].includes(currentStatus);

  const handleCancelOrder = async () => {
    try {
      await api.patch(`/api/orders/${id}/status`, { status: "cancelled" });
      setOrder((prev: any) => prev ? { ...prev, status: "cancelled" } : null);
      setCancelVisible(false);
      setHelpVisible(false);
      Alert.alert("Success", "✅ Your order has been cancelled successfully.");
    } catch (error) {
      Alert.alert("Error", "Could not cancel order.");
    }
  };

  const handleUpdatePhone = async () => {
    if (!/^\d{10}$/.test(newPhone)) {
      Alert.alert("Invalid", "Please enter a valid 10-digit mobile number.");
      return;
    }
    setOrder((prev: any) => prev ? { ...prev, phone: newPhone } : null);
    setPhoneVisible(false);
    Alert.alert("Success", "Phone number updated successfully.");
  };

  const handleUpdateAddress = async () => {
    if (!newAddress.trim()) return;
    setOrder((prev: any) => prev ? { ...prev, address: newAddress } : null);
    setAddressVisible(false);
    Alert.alert("Success", "Delivery address updated successfully.");
  };

  const navigateToChat = () => {
    setHelpVisible(false);
    router.push(`/support-chat/${id}`);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </Pressable>
        <Text style={styles.headerTitle}>Order Details</Text>
        <Pressable onPress={() => setHelpVisible(true)} style={styles.helpBtn}>
          <Text style={styles.helpText}>Help</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        
        {/* Order Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID</Text>
            <Text style={styles.infoValue}>#{(order.orderId || id).slice(-8)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Date</Text>
            <Text style={styles.infoValue}>{formatDateTime(order.createdAt) || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method</Text>
            <Text style={styles.infoValue}>{order.paymentMethod === "cod" || order.paymentMethod === "Cash on Delivery" ? "Cash on Delivery" : (order.paymentMethod || "Online Payment")}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{order.phone || order.deliveryAddress?.phone || "N/A"}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={[styles.infoValue, { flex: 2, textAlign: "right" }]} numberOfLines={3}>
              {order.address || 
                (order.deliveryAddress 
                  ? [order.deliveryAddress.houseFlat, order.deliveryAddress.streetArea, order.deliveryAddress.city, order.deliveryAddress.state, order.deliveryAddress.postalCode].filter(Boolean).join(", ") 
                  : "N/A")}
            </Text>
          </View>
        </View>

        {/* Items List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items ({order.items?.length || 0})</Text>
          {order.items?.map((item: any, i: number) => (
            <View key={item.id || i} style={styles.itemRow}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.itemImage} contentFit="cover" />
              ) : (
                <View style={[styles.itemImage, { backgroundColor: GRAY_LIGHT, justifyContent: "center", alignItems: "center" }]}>
                  <Ionicons name="image-outline" size={20} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemQty}>{item.quantity} x {item.unit}</Text>
              </View>
              <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{order.totalAmount ?? order.total ?? 0}</Text>
          </View>
        </View>

        {/* Tracking Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Status</Text>
          {isCancelled ? (
            <View style={styles.stepContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </View>
              <View style={[styles.textContainer, { paddingBottom: 0 }]}>
                <Text style={[styles.stepTitle, { color: "#EF4444" }]}>Order Cancelled</Text>
                <Text style={styles.stepDesc}>Your order has been cancelled as per your request.</Text>
                {order.cancelledAt && (
                  <Text style={styles.stepTime}>{formatDateTime(order.cancelledAt)}</Text>
                )}
              </View>
            </View>
          ) : (
            ORDER_STATUS_FLOW.filter((s) => s !== "cancelled").map((statusStep, index, arr) => {
              const stepIndex = ORDER_STATUS_FLOW.indexOf(statusStep);
              const isCompleted = stepIndex <= currentIndex;
              const isLast = index === arr.length - 1;
              const details = STATUS_DETAILS[statusStep];
              const timestamp = order[`${statusStep}At`] || (statusStep === "confirmed" ? order.createdAt : null);

              return (
                <View key={statusStep} style={styles.stepContainer}>
                  <View style={styles.iconContainer}>
                    <Ionicons 
                      name={isCompleted ? "checkmark-circle" : "radio-button-off"} 
                      size={24} 
                      color={isCompleted ? PRIMARY : "#9CA3AF"} 
                    />
                    {!isLast && (
                      <View style={[styles.verticalLine, { backgroundColor: isCompleted ? PRIMARY : GRAY_LIGHT }]} />
                    )}
                  </View>
                  <View style={[styles.textContainer, isLast && { paddingBottom: 0 }]}>
                    <Text style={[styles.stepTitle, !isCompleted && { color: TEXT_MUTED }]}>
                      {details.title}
                    </Text>
                    {isCompleted && (
                      <Text style={styles.stepDesc}>{details.desc}</Text>
                    )}
                    {isCompleted && timestamp && (
                      <Text style={styles.stepTime}>{formatDateTime(timestamp)}</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Help Bottom Sheet */}
      <Modal visible={helpVisible} transparent animationType="slide" onRequestClose={() => setHelpVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setHelpVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Need Help?</Text>
                <Pressable onPress={() => setHelpVisible(false)} style={styles.iconBtn}>
                  <Ionicons name="close" size={24} color={TEXT_DARK} />
                </Pressable>
              </View>

              <Pressable style={styles.sheetOption} onPress={() => { setHelpVisible(false); setPhoneVisible(true); }}>
                <Ionicons name="call-outline" size={22} color={PRIMARY} />
                <Text style={styles.sheetOptionText}>Change Phone Number</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>

              <Pressable style={styles.sheetOption} onPress={() => { setHelpVisible(false); setAddressVisible(true); }}>
                <Ionicons name="location-outline" size={22} color={PRIMARY} />
                <Text style={styles.sheetOptionText}>Change Delivery Address</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>

              <Pressable style={styles.sheetOption} onPress={() => { setHelpVisible(false); setCancelVisible(true); }}>
                <Ionicons name="close-circle-outline" size={22} color="#EF4444" />
                <Text style={[styles.sheetOptionText, { color: "#EF4444" }]}>Cancel Order</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>

              <Pressable style={styles.sheetOption} onPress={navigateToChat}>
                <Ionicons name="chatbubbles-outline" size={22} color={PRIMARY} />
                <Text style={styles.sheetOptionText}>Chat With Us</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>

      {/* Cancel Order Dialog */}
      <Modal visible={cancelVisible} transparent animationType="fade" onRequestClose={() => setCancelVisible(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <View style={styles.dialogIconContainer}>
              <Ionicons name="warning" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.dialogTitle}>Cancel Order</Text>
            
            {!canEditOrCancel ? (
              <>
                <Text style={styles.dialogMessage}>
                  This order can no longer be cancelled because it has already been dispatched.
                </Text>
                <Pressable style={styles.dialogBtnPrimary} onPress={() => setCancelVisible(false)}>
                  <Text style={styles.dialogBtnPrimaryText}>Okay</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.dialogMessage}>
                  Are you sure you want to cancel this order?
                </Text>
                <View style={styles.dialogBtnRow}>
                  <Pressable style={styles.dialogBtnSecondary} onPress={() => setCancelVisible(false)}>
                    <Text style={styles.dialogBtnSecondaryText}>No, Keep Order</Text>
                  </Pressable>
                  <Pressable style={[styles.dialogBtnPrimary, { backgroundColor: "#EF4444" }]} onPress={handleCancelOrder}>
                    <Text style={styles.dialogBtnPrimaryText}>Yes, Cancel Order</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Change Phone Dialog */}
      <Modal visible={phoneVisible} transparent animationType="fade" onRequestClose={() => setPhoneVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Change Phone Number</Text>
            <Text style={styles.dialogMessage}>Update the contact number for this order.</Text>
            <TextInput
              style={styles.input}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="10-digit mobile number"
            />
            <View style={styles.dialogBtnRow}>
              <Pressable style={styles.dialogBtnSecondary} onPress={() => setPhoneVisible(false)}>
                <Text style={styles.dialogBtnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.dialogBtnPrimary} onPress={handleUpdatePhone}>
                <Text style={styles.dialogBtnPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Address Dialog */}
      <Modal visible={addressVisible} transparent animationType="fade" onRequestClose={() => setAddressVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.dialogOverlay}>
          <View style={styles.dialogBox}>
            <Text style={styles.dialogTitle}>Change Delivery Address</Text>
            {!canEditOrCancel ? (
              <>
                <Text style={styles.dialogMessage}>
                  Address can no longer be changed after the order has been dispatched.
                </Text>
                <Pressable style={styles.dialogBtnPrimary} onPress={() => setAddressVisible(false)}>
                  <Text style={styles.dialogBtnPrimaryText}>Okay</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.dialogMessage}>Update the delivery address for this order.</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                  value={newAddress}
                  onChangeText={setNewAddress}
                  multiline
                  placeholder="Enter full address"
                />
                <View style={styles.dialogBtnRow}>
                  <Pressable style={styles.dialogBtnSecondary} onPress={() => setAddressVisible(false)}>
                    <Text style={styles.dialogBtnSecondaryText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.dialogBtnPrimary} onPress={handleUpdateAddress}>
                    <Text style={styles.dialogBtnPrimaryText}>Save</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG_COLOR },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_LIGHT,
  },
  iconBtn: { padding: 4 },
  headerTitle: { color: TEXT_DARK, fontSize: 18, fontWeight: "800" },
  helpBtn: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  helpText: { color: PRIMARY, fontWeight: "bold", fontSize: 14 },
  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: GRAY_LIGHT,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: TEXT_DARK,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: { color: TEXT_MUTED, fontSize: 14 },
  infoValue: { color: TEXT_DARK, fontSize: 14, fontWeight: "500" },
  
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "600", color: TEXT_DARK, marginBottom: 4 },
  itemQty: { fontSize: 12, color: TEXT_MUTED },
  itemPrice: { fontSize: 14, fontWeight: "bold", color: TEXT_DARK, marginLeft: 12 },
  
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: GRAY_LIGHT,
  },
  totalLabel: { fontSize: 16, fontWeight: "bold", color: TEXT_DARK },
  totalValue: { fontSize: 18, fontWeight: "900", color: PRIMARY },

  // Tracking Timeline
  stepContainer: { flexDirection: "row", minHeight: 70 },
  iconContainer: { alignItems: "center", marginRight: 16, width: 24 },
  verticalLine: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  textContainer: { flex: 1, paddingBottom: 24, paddingTop: 2 },
  stepTitle: { fontSize: 15, fontWeight: "bold", color: TEXT_DARK, marginBottom: 4 },
  stepDesc: { fontSize: 13, color: TEXT_MUTED, lineHeight: 18, marginBottom: 4 },
  stepTime: { fontSize: 12, color: TEXT_MUTED },

  // Modals & Bottom Sheets
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sheetTitle: { fontSize: 20, fontWeight: "bold", color: TEXT_DARK },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sheetOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: TEXT_DARK,
    marginLeft: 16,
  },

  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialogBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  dialogIconContainer: {
    alignSelf: "center",
    marginBottom: 16,
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 30,
  },
  dialogTitle: { fontSize: 18, fontWeight: "bold", color: TEXT_DARK, marginBottom: 8, textAlign: "center" },
  dialogMessage: { fontSize: 14, color: TEXT_MUTED, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  dialogBtnRow: { flexDirection: "row", gap: 12 },
  dialogBtnPrimary: {
    flex: 1,
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  dialogBtnSecondary: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  dialogBtnPrimaryText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  dialogBtnSecondaryText: { color: TEXT_DARK, fontWeight: "bold", fontSize: 15 },
  input: {
    borderWidth: 1,
    borderColor: GRAY_LIGHT,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: TEXT_DARK,
    marginBottom: 24,
    backgroundColor: "#F9FAFB",
  },
});
