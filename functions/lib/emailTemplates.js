"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCancellationEmail = exports.generateConfirmationEmail = void 0;
const generateConfirmationEmail = (order) => {
    const itemsHtml = order.items
        .map((item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; color: #1F2937;">${item.title || item.name} (x${item.quantity})</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; color: #1F2937; text-align: right;">₹${item.price * item.quantity}</td>
    </tr>
  `)
        .join("");
    const addressStr = order.deliveryAddress
        ? [
            order.deliveryAddress.houseFlat,
            order.deliveryAddress.streetArea,
            order.deliveryAddress.city,
            order.deliveryAddress.state,
            order.deliveryAddress.postalCode,
        ]
            .filter(Boolean)
            .join(", ")
        : order.address || "N/A";
    const phoneStr = order.deliveryAddress?.phone || order.phone || "N/A";
    const orderDate = order.createdAt
        ? new Date(order.createdAt._seconds * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #F3F4F6;">
      <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border-top: 6px solid #16A34A;">
        <h2 style="color: #1F2937; margin-top: 0;">Order Confirmed! 🎉</h2>
        <p style="color: #6B7280; font-size: 16px;">Your order has been placed successfully and is being prepared.</p>
        
        <div style="background-color: #F9FAFB; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 4px 0; color: #1F2937;"><strong>Order ID:</strong> #${order.orderId.slice(-8).toUpperCase()}</p>
          <p style="margin: 4px 0; color: #1F2937;"><strong>Order Date:</strong> ${orderDate}</p>
          <p style="margin: 4px 0; color: #1F2937;"><strong>Payment Method:</strong> ${order.paymentMethod || "N/A"}</p>
        </div>

        <h3 style="color: #1F2937;">Items Ordered</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          ${itemsHtml}
          <tr>
            <td style="padding: 12px; font-weight: bold; color: #1F2937;">Total Amount</td>
            <td style="padding: 12px; font-weight: bold; color: #16A34A; text-align: right;">₹${order.total}</td>
          </tr>
        </table>

        <h3 style="color: #1F2937;">Delivery Details</h3>
        <div style="background-color: #F9FAFB; padding: 16px; border-radius: 8px;">
          <p style="margin: 4px 0; color: #1F2937;"><strong>Address:</strong> ${addressStr}</p>
          <p style="margin: 4px 0; color: #1F2937;"><strong>Phone:</strong> ${phoneStr}</p>
        </div>
      </div>
      <p style="text-align: center; color: #6B7280; font-size: 14px; margin-top: 20px;">Thank you for shopping with QuickCart!</p>
    </div>
  `;
};
exports.generateConfirmationEmail = generateConfirmationEmail;
const generateCancellationEmail = (order, reason) => {
    const itemsHtml = order.items
        .map((item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; color: #1F2937;">${item.title || item.name} (x${item.quantity})</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; color: #1F2937; text-align: right;">₹${item.price * item.quantity}</td>
    </tr>
  `)
        .join("");
    const orderDate = order.createdAt
        ? new Date(order.createdAt._seconds * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const refundText = order.paymentMethod !== "Cash on Delivery" && order.paymentMethod !== "cod"
        ? "<p style='color: #6B7280; font-size: 14px; margin-top: 16px;'>Since you paid online, your refund will be processed within 5-7 business days.</p>"
        : "";
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #F3F4F6;">
      <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border-top: 6px solid #EF4444;">
        <h2 style="color: #1F2937; margin-top: 0;">Order Cancelled</h2>
        <p style="color: #6B7280; font-size: 16px;">Your order has been cancelled.</p>
        ${reason ? `<p style="color: #EF4444; font-weight: bold;">Reason: ${reason}</p>` : ''}
        
        <div style="background-color: #F9FAFB; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 4px 0; color: #1F2937;"><strong>Order ID:</strong> #${order.orderId.slice(-8).toUpperCase()}</p>
          <p style="margin: 4px 0; color: #1F2937;"><strong>Order Date:</strong> ${orderDate}</p>
        </div>

        <h3 style="color: #1F2937;">Items Ordered</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          ${itemsHtml}
          <tr>
            <td style="padding: 12px; font-weight: bold; color: #1F2937;">Total Amount</td>
            <td style="padding: 12px; font-weight: bold; color: #1F2937; text-align: right;">₹${order.total}</td>
          </tr>
        </table>

        ${refundText}
      </div>
      <p style="text-align: center; color: #6B7280; font-size: 14px; margin-top: 20px;">If you have any questions, please contact support.</p>
    </div>
  `;
};
exports.generateCancellationEmail = generateCancellationEmail;
//# sourceMappingURL=emailTemplates.js.map