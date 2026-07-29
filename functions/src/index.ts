import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import { generateConfirmationEmail, generateCancellationEmail } from "./emailTemplates";

admin.initializeApp();

// Configure the email transport using the SMTP credentials
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "quicckcart@gmail.com",
    // In a real production app, this should be stored in Firebase Secret Manager,
    // but we use it directly here as per the environment configuration
    pass: "uecq csfl uuxj eyan".replace(/\s+/g, ""),
  },
});

export const onOrderCreated = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snap, context) => {
    const order = snap.data();
    
    // We only send emails if there's an email address attached to the order
    if (!order.userEmail) {
      console.log(`No email found for order ${context.params.orderId}, skipping email.`);
      return null;
    }

    console.log(`Sending confirmation email to ${order.userEmail} for order ${context.params.orderId}`);

    const mailOptions = {
      from: '"QuickCart" <quicckcart@gmail.com>',
      to: order.userEmail,
      subject: `Order Confirmed - #${context.params.orderId.slice(-8).toUpperCase()}`,
      html: generateConfirmationEmail(order),
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Confirmation email sent successfully.");
    } catch (error) {
      console.error("Error sending confirmation email:", error);
    }

    return null;
  });

export const onOrderUpdated = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if status changed to cancelled
    if (before.status !== "cancelled" && after.status === "cancelled") {
      if (!after.userEmail) {
        console.log(`No email found for order ${context.params.orderId}, skipping cancellation email.`);
        return null;
      }

      console.log(`Sending cancellation email to ${after.userEmail} for order ${context.params.orderId}`);

      const reason = after.cancelledBy === "customer" 
        ? "Cancelled by customer" 
        : after.cancelReason || "Cancelled by system";

      const mailOptions = {
        from: '"QuickCart" <quicckcart@gmail.com>',
        to: after.userEmail,
        subject: `Order Cancelled - #${context.params.orderId.slice(-8).toUpperCase()}`,
        html: generateCancellationEmail(after, reason),
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log("Cancellation email sent successfully.");
      } catch (error) {
        console.error("Error sending cancellation email:", error);
      }
    }

    return null;
  });

import cors = require("cors");
const corsHandler = cors({ origin: true });

export const sendOtp = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ success: false, message: "Method Not Allowed" });
      return;
    }

    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)); // 10 mins

    try {
      // Store OTP in Firestore
      await admin.firestore().collection("otpCodes").doc(normalizedEmail).set({
        otp,
        expiresAt
      });

      // Send OTP via email
      const mailOptions = {
        from: '"QuickCart" <quicckcart@gmail.com>',
        to: normalizedEmail,
        subject: "Your QuickCart Password Reset OTP",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1F2937;">Password Reset</h2>
            <p style="color: #6B7280; font-size: 16px;">You requested a password reset for your QuickCart account.</p>
            <p style="color: #6B7280; font-size: 16px;">Here is your One-Time Password (OTP):</p>
            <div style="background-color: #F9FAFB; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center;">
              <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #16A34A;">${otp}</span>
            </div>
            <p style="color: #6B7280; font-size: 14px;">This OTP will expire in 10 minutes. Do not share this code with anyone.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });
});

export const verifyOtp = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ success: false, message: "Method Not Allowed" });
      return;
    }

    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ success: false, message: "Email and OTP are required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const docRef = admin.firestore().collection("otpCodes").doc(normalizedEmail);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        res.status(400).json({ success: false, message: "No OTP requested for this email" });
        return;
      }

      const data = docSnap.data();
      if (!data) {
        res.status(400).json({ success: false, message: "Invalid OTP data" });
        return;
      }

      if (data.otp !== otp.trim()) {
        res.status(400).json({ success: false, message: "Invalid OTP" });
        return;
      }

      if (data.expiresAt.toDate() < new Date()) {
        res.status(400).json({ success: false, message: "OTP has expired" });
        return;
      }

      // If valid, delete the OTP so it can't be reused
      await docRef.delete();

      res.json({ success: true, message: "OTP verified successfully" });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });
});
