"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtp = exports.sendOtp = exports.onOrderUpdated = exports.onOrderCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const emailTemplates_1 = require("./emailTemplates");
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
exports.onOrderCreated = functions.firestore
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
        html: (0, emailTemplates_1.generateConfirmationEmail)(order),
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log("Confirmation email sent successfully.");
    }
    catch (error) {
        console.error("Error sending confirmation email:", error);
    }
    return null;
});
exports.onOrderUpdated = functions.firestore
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
            html: (0, emailTemplates_1.generateCancellationEmail)(after, reason),
        };
        try {
            await transporter.sendMail(mailOptions);
            console.log("Cancellation email sent successfully.");
        }
        catch (error) {
            console.error("Error sending cancellation email:", error);
        }
    }
    return null;
});
const cors = require("cors");
const corsHandler = cors({ origin: true });
exports.sendOtp = functions.https.onRequest((req, res) => {
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
        }
        catch (error) {
            console.error("Error sending OTP:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    });
});
exports.verifyOtp = functions.https.onRequest((req, res) => {
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
        }
        catch (error) {
            console.error("Error verifying OTP:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    });
});
//# sourceMappingURL=index.js.map