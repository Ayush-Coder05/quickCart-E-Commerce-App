// ─────────────────────────────────────────────────────────────────────────────
//  services/orderService.ts
//
//  Centralised order logic using MongoDB FastAPI API (/api/orders).
// ─────────────────────────────────────────────────────────────────────────────

import { api } from "../utils/api";
import { CartItem } from "../utils/cartStore";
import { SavedAddress } from "./addressService";
import { sendLocalOrderNotification } from "./notificationService";

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
  estimatedDelivery: Date;
}

/**
 * Place a new order using the MongoDB FastAPI API.
 */
export async function placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
  const { cartItems, selectedAddress, grandTotal, itemTotal, deliveryFee } = params;

  let orderId = `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  let estimatedDelivery = new Date(Date.now() + 45 * 60 * 1000);

  try {
    const res = await api.post<{ success: boolean; orderId: string; estimatedDelivery: string }>(
      "/api/orders",
      {
        cartItems: cartItems.map((item) => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          imageUrl: item.imageUrl ?? "",
        })),
        selectedAddress: {
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
        grandTotal,
        itemTotal,
        deliveryFee,
        freeDelivery: params.freeDelivery ?? (deliveryFee === 0),
        paymentMethod: "Cash on Delivery",
      }
    );
    if (res?.orderId) {
      orderId = res.orderId;
    }
    if (res?.estimatedDelivery) {
      estimatedDelivery = new Date(res.estimatedDelivery);
    }
  } catch (apiErr) {
    console.warn("[orderService] MongoDB placeOrder API failed:", apiErr);
  }

  // Send local push notification
  sendLocalOrderNotification("Order Placed Successfully! 🎉", `Your order #${orderId.slice(-6).toUpperCase()} for ₹${grandTotal} has been confirmed.`).catch(() => {});

  return { orderId, estimatedDelivery };
}

/**
 * Fetch all orders for current user from MongoDB.
 */
export async function getMyOrders(): Promise<any[]> {
  try {
    const res = await api.get<{ success: boolean; orders: any[] }>("/api/orders");
    return res.orders || [];
  } catch (err) {
    console.warn("[orderService] getMyOrders error:", err);
    return [];
  }
}

/**
 * Notify admin devices via push token if available.
 */
export async function notifyAdmins(
  orderId:   string,
  itemCount: number,
  total:     number,
): Promise<void> {
  try {
    const res = await api.get<{ success: boolean; users: any[] }>("/api/users").catch(() => null);
    if (!res?.users) return;

    const tokens: string[] = res.users
      .filter((u: any) => u.role === "admin" && u.pushToken && u.pushToken.startsWith("ExponentPushToken["))
      .map((u: any) => u.pushToken);

    if (tokens.length === 0) return;

    const messages = tokens.map((to) => ({
      to,
      sound:    "default",
      title:    "🛒 New Order Received!",
      body:     `${itemCount} item${itemCount !== 1 ? "s" : ""} · ₹${total} · #${orderId.slice(-8).toUpperCase()}`,
      data:     { orderId, screen: "admin/orders" },
      priority: "high",
      channelId: "quickcart-orders",
    }));

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
    console.warn("[orderService] notifyAdmins failed:", err);
  }
}
