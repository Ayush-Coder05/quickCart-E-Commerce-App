// ─────────────────────────────────────────────────────────────────────────────
//  services/orderService.ts
//
//  Centralised order logic:
//   - placeOrder()          → writes order doc to Firestore
//   - scheduleAutoConfirm() → auto-confirms a pending order after a delay
//   - notifyAdmins()        → sends Expo push notification to all admin devices
// ─────────────────────────────────────────────────────────────────────────────

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { CartItem } from "../utils/cartStore";
import { SavedAddress } from "./addressService";
import { sendLocalOrderNotification } from "./notificationService";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlaceOrderParams {
  uid:             string;
  userEmail:       string;
  cartItems:       CartItem[];
  selectedAddress: SavedAddress;
  grandTotal:      number;
  itemTotal:       number;
  deliveryFee:     number;
  freeDelivery?:   boolean;
}

export interface PlaceOrderResult {
  orderId:           string;
  estimatedDelivery: Date; // wall-clock Date object for display
}

// ── placeOrder ────────────────────────────────────────────────────────────────

/**
 * Write a new order document to Firestore with status "pending".
 * Returns the generated orderId.
 */
export async function placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
  const { uid, userEmail, cartItems, selectedAddress, grandTotal, itemTotal, deliveryFee } = params;

  const orderRef          = doc(collection(db, "orders"));
  const estimatedDelivery  = new Date(Date.now() + 45 * 60 * 1000); // now + 45 min

  await setDoc(orderRef, {
    orderId:           orderRef.id,
    userId:            uid,
    userEmail:         userEmail,
    items:             cartItems.map((item) => ({
      id:       item.id,
      title:    item.title,
      quantity: item.quantity,
      price:    item.price,
      imageUrl: item.imageUrl ?? "",
    })),
    total:             grandTotal,
    subtotal:          itemTotal,
    deliveryCharge:    deliveryFee,
    freeDelivery:      params.freeDelivery ?? (deliveryFee === 0),
    status:            "confirmed",
    paymentMethod:     "Cash on Delivery",
    estimatedDelivery: estimatedDelivery,
    deliveryAddress: {
      label:         selectedAddress.label,
      recipientName: selectedAddress.recipientName,
      phone:         selectedAddress.phone,
      houseFlat:     selectedAddress.houseFlat,
      streetArea:    selectedAddress.streetArea,
      landmark:      selectedAddress.landmark,
      city:          selectedAddress.city,
      state:         selectedAddress.state,
      postalCode:    selectedAddress.postalCode,
      notes:         selectedAddress.notes,
    },
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });

  return { orderId: orderRef.id, estimatedDelivery };
}


// ── notifyAdmins ───────────────────────────────────────────────────────────────

/**
 * Fetch all admin push tokens from Firestore and send a push notification
 * via the Expo Push API (https://exp.host/--/api/v2/push/send).
 * No server required — the Expo API is free and public.
 */
export async function notifyAdmins(
  orderId:   string,
  itemCount: number,
  total:     number,
): Promise<void> {
  try {
    // 1. Query all admin users who have a stored push token
    const snap = await getDocs(
      query(collection(db, "users"), where("role", "==", "admin")),
    );

    const tokens: string[] = [];
    snap.docs.forEach((d) => {
      const token = d.data()?.pushToken as string | undefined;
      if (token && token.startsWith("ExponentPushToken[")) {
        tokens.push(token);
      }
    });

    if (tokens.length === 0) return; // no admin devices registered yet

    // 2. Build the notification payload
    const messages = tokens.map((to) => ({
      to,
      sound:    "default",
      title:    "🛒 New Order Received!",
      body:     `${itemCount} item${itemCount !== 1 ? "s" : ""} · ₹${total} · #${orderId.slice(-8).toUpperCase()}`,
      data:     { orderId, screen: "admin/orders" },
      priority: "high",
      channelId: "quickcart-orders",
    }));

    // 3. POST to Expo Push API (batched, max 100 per request)
    const BATCH_SIZE = 100;
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      await fetch("https://exp.host/--/api/v2/push/send", {
        method:  "POST",
        headers: {
          "Accept":       "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });
    }
  } catch (err) {
    // Non-critical — order is placed regardless of notification success
    console.warn("[orderService] notifyAdmins failed:", err);
  }
}
