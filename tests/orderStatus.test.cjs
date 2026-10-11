const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ORDER_STATUS_FLOW,
  canUpdateOrderStatus,
} = require("../.test-build/orderStatus.js");

test("exposes every customer-visible fulfillment state", () => {
  assert.deepEqual(ORDER_STATUS_FLOW, [
    "confirmed",
    "preparing",
    "packed",
    "outForDelivery",
    "delivered",
    "cancelled",
  ]);
});

test("permits the next fulfillment step", () => {
  assert.equal(canUpdateOrderStatus("confirmed", "preparing"), true);
  assert.equal(canUpdateOrderStatus("preparing", "packed"), true);
  assert.equal(canUpdateOrderStatus("packed", "outForDelivery"), true);
  assert.equal(canUpdateOrderStatus("outForDelivery", "delivered"), true);
});

test("allows cancellation only before delivery", () => {
  assert.equal(canUpdateOrderStatus("confirmed", "cancelled"), true);
  assert.equal(canUpdateOrderStatus("outForDelivery", "cancelled"), true);
  assert.equal(canUpdateOrderStatus("delivered", "cancelled"), false);
});

test("rejects backwards, skipped, and terminal-state transitions", () => {
  assert.equal(canUpdateOrderStatus("confirmed", "packed"), false);
  assert.equal(canUpdateOrderStatus("delivered", "confirmed"), false);
  assert.equal(canUpdateOrderStatus("cancelled", "confirmed"), false);
});
