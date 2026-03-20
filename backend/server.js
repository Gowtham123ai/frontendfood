import express from "express";
import Razorpay from "razorpay";
import cors from "cors";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import os from "os";
import admin from "firebase-admin";
import crypto from "crypto";

dotenv.config({ path: "../.env" }); // Use the root .env

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firestore
admin.initializeApp({
  projectId: "login-d9d7f"
});

const db = admin.firestore();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "your_key",
  key_secret: process.env.RAZORPAY_SECRET || "your_secret",
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // App password
  },
});

async function createInvoicePDF(order, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Header with Premium UI
    doc.fillColor("#ff6b00").fontSize(25).text("MAGIZHAMUDHU Kitchen", { align: "center" });
    doc.fontSize(10).fillColor("#444444").text("Deliciously Delivered", { align: "center" });
    doc.moveDown();

    doc.strokeColor("#eeeeee").moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Order Info
    doc.fillColor("#000000").fontSize(12).text(`Order ID: ${order.id}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Customer: ${order.userName}`);
    doc.text(`Address: ${order.address}`);
    doc.moveDown();

    // Table Header
    doc.fillColor("#f3f4f6").rect(50, doc.y, 500, 20).fill();
    doc.fillColor("#000000").fontSize(10).text("Item", 60, doc.y - 15);
    doc.text("Qty", 350, doc.y - 15);
    doc.text("Price", 450, doc.y - 15);
    doc.moveDown(0.5);

    // Items
    order.items.forEach(item => {
      doc.text(item.name, 60, doc.y);
      doc.text(item.quantity.toString(), 350, doc.y - 10);
      doc.text(`\u20B9${item.price}`, 450, doc.y - 10);
      doc.moveDown(0.5);
    });

    doc.moveDown();
    doc.strokeColor("#eeeeee").moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Total Amount
    doc.fontSize(15).fillColor("#ff6b00").text(`Total Amount: \u20B9${order.totalAmount}`, { align: "right" });

    doc.moveDown(2);
    doc.fillColor("#666666").fontSize(10).text("\uD83C\uDF5B Thank you for ordering with MAGIZHAMUDHU! We hope you enjoy your meal.", { align: "center" });

    doc.end();

    writeStream.on("finish", () => resolve(filePath));
    writeStream.on("error", reject);
  });
}

// Routes
const router = express.Router();

// 0. Send COD Bill Email Route
router.post("/send-cod-bill", async (req, res) => {
  console.log("📥 Received COD Bill Request!");
  try {
    const orderData = req.body;
    console.log("📨 Attempting to email: ", orderData.email);
    const orderId = orderData.id || `cod_${Date.now()}`;

    // Generate Invoice
    const tempFilePath = path.join(os.tmpdir(), `invoice_${orderId}.pdf`);
    await createInvoicePDF(orderData, tempFilePath);

    // Send Email
    await transporter.sendMail({
      from: `"MAGIZHAMUDHU Kitchen" <${process.env.GMAIL_USER}>`,
      to: orderData.email,
      subject: "Your MAGIZHAMUDHU Order Confirmation (COD) 🍱",
      text: `Hi ${orderData.userName}, thank you for your COD order! Attached is your order summary for Order #${orderId.slice(-6)}.`,
      attachments: [{ filename: `Invoice_${orderId.slice(-6)}.pdf`, path: tempFilePath }],
    });

    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

    res.json({ success: true, message: "Email sent" });
  } catch (err) {
    console.error("COD Email Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Create Order Route
router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    console.log("💰 Creating order for amount:", amount);
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });
    console.log("✅ Order created:", order.id);
    res.json(order);
  } catch (err) {
    console.error("Create Order Error:", err);
    res.status(500).json(err);
  }
});

// 2. Verify Payment Route
router.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;

    const signature = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(signature.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid Signature" });
    }

    // Save to Firestore
    try {
      const finalOrder = {
        ...orderData,
        id: razorpay_order_id,
        paymentId: razorpay_payment_id,
        status: 'Pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await db.collection("orders").doc(razorpay_order_id).set(finalOrder);

      // Generate Invoice
      const tempFilePath = path.join(os.tmpdir(), `invoice_${razorpay_order_id}.pdf`);
      await createInvoicePDF(finalOrder, tempFilePath);

      // Send Email
      await transporter.sendMail({
        from: `"MAGIZHAMUDHU Kitchen" <${process.env.GMAIL_USER}>`,
        to: orderData.email,
        subject: "Your MAGIZHAMUDHU Order Invoice 🍱",
        text: `Hi ${orderData.userName}, thank you for your order! Attached is your invoice for Order #${razorpay_order_id.slice(-6)}.`,
        attachments: [{ filename: `Invoice_${razorpay_order_id.slice(-6)}.pdf`, path: tempFilePath }],
      });

      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    } catch (dbErr) {
      console.error("Post-payment processing error (Firestore/Email):", dbErr);
      // Don't fail the response if email/firestore fails after payment is confirmed
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Verify Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use("/api", router);
app.use("/", router);


const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 MAGIZHAMUDHU Backend running on port ${PORT}`));
