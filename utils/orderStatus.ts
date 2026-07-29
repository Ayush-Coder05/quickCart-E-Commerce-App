export type OrderStatus = "confirmed" | "preparing" | "packed" | "outForDelivery" | "delivered" | "cancelled";

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "confirmed",
  "preparing",
  "packed",
  "outForDelivery",
  "delivered",
  "cancelled",
];

export const NEXT_ORDER_STATUS: Record<OrderStatus, OrderStatus | null> = {
  confirmed: "preparing",
  preparing: "packed",
  packed: "outForDelivery",
  outForDelivery: "delivered",
  delivered: null,
  cancelled: null,
};

export function canUpdateOrderStatus(current: OrderStatus, next: OrderStatus): boolean {
  if (current === next) return true;
  if (current === "delivered" || current === "cancelled") return false;
  return next === "cancelled" || NEXT_ORDER_STATUS[current] === next;
}
