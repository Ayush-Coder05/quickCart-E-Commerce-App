import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Platform, Alert, Image } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cartStore, CartItem } from "../utils/cartStore";
import { formatRupees } from "../utils/currency";
import { ROUTES } from "../utils/routes";

const PRIMARY_COLOR = "#16A34A";
const BG_COLOR = "#F3F4F6";
const TEXT_DARK = "#212121";
const TEXT_MUTED = "#6B7280";
const DELIVERY_FEE = 49;
const FREE_DELIVERY_THRESHOLD = 500;

function CartItemRow({ item }: { item: CartItem }) {
  const itemSubtotal = item.price * item.quantity;

  const handleIncrease = () => cartStore.increaseQty(item.id);
  const handleDecrease = () => cartStore.remove(item.id); // decrements or removes at qty 1

  const handleDelete = () => {
    Alert.alert(
      "Remove item",
      `Remove "${item.title}" from your cart?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => cartStore.deleteItem(item.id),
        },
      ]
    );
  };

  return (
    <View style={styles.cartItem}>
      {/* Emoji / image */}
      <View style={styles.itemEmojiContainer}>
        {item.imageUrl ? (
          <Image key={`${item.imageUrl}-${item.updatedAt || ''}`} source={{ uri: item.updatedAt ? (item.imageUrl.includes('?') ? `${item.imageUrl}&t=${item.updatedAt}` : `${item.imageUrl}?t=${item.updatedAt}`) : item.imageUrl }} style={{ width: "100%", height: "100%", resizeMode: "cover", borderRadius: 10 }} />
        ) : (
          item.emoji ? (<Text style={styles.itemEmoji}>{item.emoji}</Text>) : (<Ionicons name="image-outline" size={24} color="#9CA3AF" />)
        )}
      </View>

      {/* Info */}
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        {item.label ? <Text style={styles.itemLabel}>{item.label}</Text> : null}
        <Text style={styles.itemPrice}>{formatRupees(item.price)} each</Text>
        <Text style={styles.itemSubtotal}>{formatRupees(itemSubtotal)}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsColumn}>
        {/* Trash button */}
        <Pressable style={styles.trashBtn} onPress={handleDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </Pressable>

        {/* Qty stepper */}
        <View style={styles.qtyControl}>
          <Pressable style={styles.qtyBtn} onPress={handleDecrease}>
            <Text style={styles.qtyBtnText}>{item.quantity === 1 ? "🗑" : "−"}</Text>
          </Pressable>
          <Text style={styles.qtyValue}>{item.quantity}</Text>
          <Pressable style={styles.qtyBtn} onPress={handleIncrease}>
            <Text style={styles.qtyBtnText}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<CartItem[]>(cartStore.items);

  useEffect(() => {
    // Sync on mount
    setItems([...cartStore.items]);
    return cartStore.subscribe((newItems) => setItems(newItems));
  }, []);

  const itemTotal   = cartStore.totalPrice;
  const deliveryFee = itemTotal >= FREE_DELIVERY_THRESHOLD || itemTotal === 0 ? 0 : DELIVERY_FEE;
  const grandTotal  = itemTotal + deliveryFee;
  const isCartEmpty = items.length === 0;

  const handleClearCart = () => {
    Alert.alert(
      "Clear cart",
      "Remove all items from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => cartStore.clear() },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </Pressable>
        <Text style={styles.headerTitle}>Your Cart</Text>
        {!isCartEmpty ? (
          <Pressable onPress={handleClearCart} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      {isCartEmpty ? (
        /* ── Empty state ──────────────────────────────────────────────────── */
        <View style={styles.emptyState}>
          <View style={styles.emptyEmoji}>
            <Ionicons name="cart-outline" size={72} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Looks like you haven&apos;t added anything yet.</Text>
          <Pressable style={styles.shopBtn} onPress={() => router.back()}>
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          >
            {/* Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Items ({cartStore.totalItems} {cartStore.totalItems === 1 ? "item" : "items"})
              </Text>
              <View style={styles.card}>
                {items.map((item, index) => (
                  <View key={item.id}>
                    <CartItemRow item={item} />
                    {index < items.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            </View>

            {/* Bill Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bill Details</Text>
              <View style={styles.card}>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Item Total</Text>
                  <Text style={styles.billValue}>{formatRupees(itemTotal)}</Text>
                </View>

                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Delivery Fee</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {deliveryFee === 0 && itemTotal > 0 && (
                      <Text style={[styles.billValue, { textDecorationLine: "line-through", color: TEXT_MUTED, fontSize: 12 }]}>
                        {formatRupees(DELIVERY_FEE)}
                      </Text>
                    )}
                    <Text style={[styles.billValue, deliveryFee === 0 ? styles.freeText : null]}>
                      {deliveryFee === 0 ? "FREE" : formatRupees(deliveryFee)}
                    </Text>
                  </View>
                </View>

                {itemTotal > 0 && itemTotal < FREE_DELIVERY_THRESHOLD && (
                  <Text style={styles.deliveryHint}>
                    Add {formatRupees(FREE_DELIVERY_THRESHOLD - itemTotal)} more for Free Delivery!
                  </Text>
                )}

                <View style={[styles.divider, { marginVertical: 12 }]} />

                <View style={styles.billRow}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalValue}>{formatRupees(grandTotal)}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* ── Checkout Bar (only shown when cart has items) ─────────────── */}
          <View style={[styles.checkoutBarContainer, { bottom: 0, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.checkoutBarInner}>
              <View>
                <Text style={styles.checkoutTotalLabel}>To Pay</Text>
                <Text style={styles.checkoutTotalValue}>{formatRupees(grandTotal)}</Text>
              </View>
              <Pressable
                style={styles.checkoutBtn}
                onPress={() => router.push(ROUTES.checkout)}
              >
                <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG_COLOR },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "ios" ? 50 : (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  backBtn:  { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  clearBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  clearBtnText: { color: "#EF4444", fontSize: 13, fontWeight: "700" },
  headerTitle: { color: TEXT_DARK, fontSize: 18, fontWeight: "800" },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16 },

  section:      { marginBottom: 24 },
  sectionTitle: { color: TEXT_DARK, fontSize: 16, fontWeight: "800", marginBottom: 12, paddingHorizontal: 4 },
  card:         { backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  divider:      { height: 1, backgroundColor: "#E5E7EB", marginVertical: 16 },

  cartItem:           { flexDirection: "row", alignItems: "center", gap: 12 },
  itemEmojiContainer: { width: 52, height: 52, backgroundColor: "#F9FAFB", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  itemEmoji:          { fontSize: 26 },
  itemInfo:           { flex: 1 },
  itemTitle:          { color: TEXT_DARK, fontSize: 13, fontWeight: "600", marginBottom: 2, lineHeight: 18 },
  itemLabel:          { color: TEXT_MUTED, fontSize: 11, marginBottom: 2 },
  itemPrice:          { color: TEXT_MUTED, fontSize: 12, fontWeight: "500" },
  itemSubtotal:       { color: TEXT_DARK, fontSize: 14, fontWeight: "800", marginTop: 2 },

  controlsColumn: { alignItems: "center", gap: 8, minWidth: 76 },
  trashBtn:       { padding: 4 },

  qtyControl:  { flexDirection: "row", alignItems: "center", backgroundColor: PRIMARY_COLOR, borderRadius: 6, overflow: "hidden" },
  qtyBtn:      { minWidth: 40, minHeight: 40, alignItems: "center", justifyContent: "center" },
  qtyBtnText:  { color: "#fff", fontSize: 14, fontWeight: "900" },
  qtyValue:    { color: "#fff", fontSize: 13, fontWeight: "800", minWidth: 20, textAlign: "center" },

  billRow:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  billLabel:       { color: TEXT_MUTED, fontSize: 14, fontWeight: "500" },
  billValue:       { color: TEXT_DARK, fontSize: 14, fontWeight: "700" },
  freeText:        { color: PRIMARY_COLOR, fontWeight: "900" },
  deliveryHint:    { color: PRIMARY_COLOR, fontSize: 12, fontWeight: "600", backgroundColor: "#DCFCE7", padding: 8, borderRadius: 6, overflow: "hidden", marginBottom: 8 },
  grandTotalLabel: { color: TEXT_DARK, fontSize: 16, fontWeight: "800" },
  grandTotalValue: { color: TEXT_DARK, fontSize: 18, fontWeight: "900" },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyEmoji: { marginBottom: 16 },
  emptyTitle: { color: TEXT_DARK, fontSize: 20, fontWeight: "800", marginBottom: 8 },
  emptySub:   { color: TEXT_MUTED, fontSize: 15, textAlign: "center", marginBottom: 24 },
  shopBtn:    { backgroundColor: PRIMARY_COLOR, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  shopBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  checkoutBarContainer: { position: "absolute", left: 0, right: 0, padding: 12, backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 15 },
  checkoutBarInner:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: PRIMARY_COLOR, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 },
  checkoutTotalLabel:   { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600", marginBottom: 2 },
  checkoutTotalValue:   { color: "#fff", fontSize: 18, fontWeight: "900" },
  checkoutBtn:          { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  checkoutBtnText:      { color: "#fff", fontSize: 15, fontWeight: "800" },
});


