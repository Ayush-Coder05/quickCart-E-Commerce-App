const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ORDER_STATUS_FLOW,
  canUpdateOrderStatus,
} = require("../.test-build/orderStatus.js");

test("exposes every customer-visible fulfillment state", () => {
  assert.deepEqual(ORDER_STATUS_FLOW, [
    "pending",
    "confirmed",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
  ]);
});

test("permits the next fulfillment step", () => {
  assert.equal(canUpdateOrderStatus("pending", "confirmed"), true);
  assert.equal(canUpdateOrderStatus("confirmed", "packed"), true);
  assert.equal(canUpdateOrderStatus("packed", "shipped"), true);
  assert.equal(canUpdateOrderStatus("shipped", "delivered"), true);
});

test("allows cancellation only before delivery", () => {
  assert.equal(canUpdateOrderStatus("pending", "cancelled"), true);
  assert.equal(canUpdateOrderStatus("shipped", "cancelled"), true);
  assert.equal(canUpdateOrderStatus("delivered", "cancelled"), false);
});

test("rejects backwards, skipped, and terminal-state transitions", () => {
  assert.equal(canUpdateOrderStatus("pending", "packed"), false);
  assert.equal(canUpdateOrderStatus("delivered", "pending"), false);
  assert.equal(canUpdateOrderStatus("cancelled", "confirmed"), false);
});
