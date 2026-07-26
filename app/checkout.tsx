import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Platform, ActivityIndicator, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cartStore } from "../utils/cartStore";
import { stateStore } from "../utils/stateStore";
import { formatRupees } from "../utils/currency";
import { ROUTES } from "../utils/routes";
import { auth, db } from "../utils/firebase";
import { getAddresses, SavedAddress } from "../services/addressService";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";

const PRIMARY_COLOR = "#16A34A";
const BG_COLOR = "#F3F4F6";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";
const DELIVERY_FEE = 49;
const FREE_DELIVERY_THRESHOLD = 500;

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [cartItems, setCartItems] = useState(cartStore.items);

  // ── Address state ──────────────────────────────────────────────────────────
  const [addresses,       setAddresses]       = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [addrLoading,     setAddrLoading]     = useState(true);

  React.useEffect(() => cartStore.subscribe(setCartItems), []);

  const itemTotal   = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = itemTotal >= FREE_DELIVERY_THRESHOLD || itemTotal === 0 ? 0 : DELIVERY_FEE;
  const grandTotal  = itemTotal + deliveryFee;
  const isCompleteAddress = (address: SavedAddress | null): address is SavedAddress => {
    if (!address) return false;
    return Boolean(
      address.houseFlat?.trim() &&
      address.streetArea?.trim() &&
      address.city?.trim() &&
      address.state?.trim() &&
      /^\d{6}$/.test(address.postalCode?.trim() || "") &&
      /^\d{10}$/.test((address.phone || "").replace(/\D/g, ""))
    );
  };

  // ── Load addresses every time screen gains focus ───────────────────────────
  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const uid = auth.currentUser?.uid;
        if (!uid) { setAddrLoading(false); return; }
        try {
          setAddrLoading(true);
          const list = await getAddresses(uid);
          if (!active) return;
          setAddresses(list);
          // Select default, or first, or none
          const defaultAddr = list.find((a) => a.isDefault) ?? list[0] ?? null;
          setSelectedAddress(defaultAddr);
        } catch {
          // silently fall back - user can still see state-based delivery info
        } finally {
          if (active) setAddrLoading(false);
        }
      }
      load();
      return () => { active = false; };
    }, []),
  );

  const handlePlaceOrder = async () => {
    if (isProcessing) return;
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Login required", "Please sign in before placing an order.");
      return;
    }
    if (cartItems.length === 0) {
      Alert.alert("Cart empty", "Please add items before placing an order.");
      return;
    }
    if (!isCompleteAddress(selectedAddress)) {
      Alert.alert(
        "Complete address required",
        "Please add or edit your delivery address with house/flat number, street/area, city, state, 6-digit pincode, and 10-digit phone number."
      );
      handleAddAddress();
      return;
    }

    setIsProcessing(true);
    try {
      const orderRef = doc(collection(db, "orders"));
      await setDoc(orderRef, {
        orderId: orderRef.id,
        userId: uid,
        userEmail: auth.currentUser?.email ?? "",
        items: cartItems.map((item) => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          imageUrl: item.imageUrl ?? "",
        })),
        total: grandTotal,
        subtotal: itemTotal,
        deliveryFee,
        status: "pending",
        paymentMethod: "Cash on Delivery",
        deliveryAddress: {
          label: selectedAddress.label,
          recipientName: selectedAddress.recipientName,
          phone: selectedAddress.phone,
          houseFlat: selectedAddress.houseFlat,
          streetArea: selectedAddress.streetArea,
          landmark: selectedAddress.landmark,
          city: selectedAddress.city,
          state: selectedAddress.state,
          postalCode: selectedAddress.postalCode,
          notes: selectedAddress.notes,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await cartStore.clear();
      setOrderSuccess(true);
    } catch (error) {
      console.error("Error placing order:", error);
      Alert.alert("Checkout failed", "Could not place your order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };
  const handleBackToHome = () => {
    router.replace(ROUTES.home);
  };

  const handleChangeAddress = () => {
    if (selectedAddress) {
      router.push({ pathname: "/address" as const, params: { addressId: selectedAddress.id } });
    } else {
      router.push("/address" as const);
    }
  };

  const handleAddAddress = () => {
    router.push("/address" as const);
  };

  if (orderSuccess) {
    return (
      <View style={[styles.screen, styles.centerContent]}>
        <StatusBar barStyle="light-content" />
        <Animated.View entering={ZoomIn.springify()} style={styles.successCircle}>
          <Ionicons name="checkmark" size={64} color="#fff" />
        </Animated.View>
        <Animated.Text entering={FadeIn.delay(300)} style={styles.successTitle}>
          Order Placed Successfully!
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(400)} style={styles.successSub}>
          Your groceries are being packed and will be delivered to{" "}
          {selectedAddress
            ? `${selectedAddress.houseFlat}, ${selectedAddress.city}`
            : stateStore.current || "your location"}{" "}
          shortly.
        </Animated.Text>
        <Animated.View entering={FadeIn.delay(600)} style={{ width: "100%", paddingHorizontal: 32, marginTop: 32 }}>
          <Pressable style={styles.homeBtn} onPress={handleBackToHome}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}>

        {/* ── Delivery Address ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.card}>
            {addrLoading ? (
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            ) : selectedAddress ? (
              <>
                <View style={styles.row}>
                  <View style={styles.iconBox}>
                    <Ionicons name="location" size={20} color={PRIMARY_COLOR} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <Text style={styles.cardTitle}>{selectedAddress.recipientName || "Home Delivery"}</Text>
                      <View style={styles.labelBadge}>
                        <Text style={styles.labelBadgeText}>{selectedAddress.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardSub}>
                      {[selectedAddress.houseFlat, selectedAddress.streetArea, selectedAddress.landmark]
                        .filter(Boolean).join(", ")}
                    </Text>
                    <Text style={styles.cardSub}>
                      {[selectedAddress.city, selectedAddress.state, selectedAddress.postalCode]
                        .filter(Boolean).join(", ")}
                    </Text>
                    {selectedAddress.phone ? (
                      <Text style={styles.cardSub}>Phone: {selectedAddress.phone}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.addrActions}>
                  <Pressable onPress={handleChangeAddress} style={styles.addrBtn}>
                    <Ionicons name="create-outline" size={14} color={PRIMARY_COLOR} />
                    <Text style={styles.addrBtnText}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={handleAddAddress} style={styles.addrBtn}>
                    <Ionicons name="add-circle-outline" size={14} color={PRIMARY_COLOR} />
                    <Text style={styles.addrBtnText}>Add New</Text>
                  </Pressable>
                  {addresses.length > 1 && (
                    <Pressable
                      style={styles.addrBtn}
                      onPress={() => {
                        // Cycle to next address
                        const idx     = addresses.findIndex((a) => a.id === selectedAddress.id);
                        const nextIdx = (idx + 1) % addresses.length;
                        setSelectedAddress(addresses[nextIdx]);
                      }}
                    >
                      <Ionicons name="swap-horizontal-outline" size={14} color={PRIMARY_COLOR} />
                      <Text style={styles.addrBtnText}>Change</Text>
                    </Pressable>
                  )}
                </View>
              </>
            ) : (
              /* No address saved yet */
              <Pressable onPress={handleAddAddress} style={styles.addAddrPrompt}>
                <Ionicons name="add-circle-outline" size={24} color={PRIMARY_COLOR} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Add Delivery Address</Text>
                  <Text style={styles.cardSub}>
                    Tap to add your address. You can use your current location.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Payment Method ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.card}>
            <View style={[styles.row, { marginBottom: 16 }]}>
              <Ionicons name="radio-button-on" size={24} color={PRIMARY_COLOR} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>Cash on Delivery</Text>
                <Text style={styles.cardSub}>Pay when your order arrives</Text>
              </View>
            </View>
            <View style={[styles.divider, { marginVertical: 0, marginBottom: 16 }]} />
            <View style={[styles.row, { opacity: 0.5 }]}>
              <Ionicons name="radio-button-off" size={24} color={TEXT_MUTED} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>UPI / Cards (Coming Soon)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Order Summary ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.card}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>{cartStore.totalItems} Items Total</Text>
              <Text style={styles.billValue}>{formatRupees(itemTotal)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              <Text style={styles.billValue}>{deliveryFee === 0 ? "FREE" : formatRupees(deliveryFee)}</Text>
            </View>
            <View style={[styles.divider, { marginVertical: 12 }]} />
            <View style={styles.billRow}>
              <Text style={styles.grandTotalLabel}>Amount to Pay</Text>
              <Text style={styles.grandTotalValue}>{formatRupees(grandTotal)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Pay Bar ─────────────────────────────────────────────────────── */}
      <View style={[styles.payBarContainer, { bottom: 0, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          style={[styles.payBtn, isProcessing && styles.payBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>Place Order - {formatRupees(grandTotal)}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG_COLOR },
  centerContent: { justifyContent: "center", alignItems: "center", backgroundColor: PRIMARY_COLOR },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  backBtn:     { padding: 4 },
  headerTitle: { color: TEXT_DARK, fontSize: 18, fontWeight: "800" },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16 },

  section:      { marginBottom: 24 },
  sectionTitle: { color: TEXT_DARK, fontSize: 16, fontWeight: "800", marginBottom: 12, paddingHorizontal: 4 },
  card:         { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  divider:      { height: 1, backgroundColor: "#E5E7EB", marginVertical: 16 },

  row:    { flexDirection: "row", alignItems: "flex-start" },
  iconBox: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: "#DCFCE7", alignItems: "center",
    justifyContent: "center", marginRight: 12,
  },
  cardTitle: { color: TEXT_DARK, fontSize: 15, fontWeight: "700", marginBottom: 2 },
  cardSub:   { color: TEXT_MUTED, fontSize: 13, marginBottom: 2, lineHeight: 18 },

  // Address label badge
  labelBadge:     { backgroundColor: "#F3E5F5", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  labelBadgeText: { fontSize: 11, fontWeight: "700", color: "#16A34A" },

  // Address actions row
  addrActions: { flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  addrBtn:     { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#F0FDF4" },
  addrBtnText: { fontSize: 13, fontWeight: "600", color: PRIMARY_COLOR },

  // No address prompt
  addAddrPrompt: { flexDirection: "row", alignItems: "center", gap: 12 },

  billRow:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  billLabel:       { color: TEXT_MUTED, fontSize: 14, fontWeight: "500" },
  billValue:       { color: TEXT_DARK, fontSize: 14, fontWeight: "700" },
  grandTotalLabel: { color: TEXT_DARK, fontSize: 16, fontWeight: "800" },
  grandTotalValue: { color: TEXT_DARK, fontSize: 18, fontWeight: "900" },

  payBarContainer: {
    position: "absolute", left: 0, right: 0, padding: 16,
    backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 15,
  },
  payBtn:         { backgroundColor: PRIMARY_COLOR, paddingVertical: 16, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  payBtnDisabled: { opacity: 0.8 },
  payBtnText:     { color: "#fff", fontSize: 16, fontWeight: "800" },

  // Success
  successCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  successTitle:  { color: "#fff", fontSize: 24, fontWeight: "900", marginBottom: 12, textAlign: "center" },
  successSub:    { color: "rgba(255,255,255,0.9)", fontSize: 15, textAlign: "center", paddingHorizontal: 32, lineHeight: 22 },
  homeBtn:       { backgroundColor: "#fff", paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  homeBtnText:   { color: PRIMARY_COLOR, fontSize: 16, fontWeight: "800" },
});



