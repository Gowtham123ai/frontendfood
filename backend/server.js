import express from "express";
import Razorpay from "razorpay";
import cors from "cors";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import path from "path";
import os from "os";
import fs from "fs";
import admin from "firebase-admin";
import crypto from "crypto";

// Load environment from root .env if it exists (local dev)
const envPath = path.resolve(process.cwd(), "../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // Fallback for Vercel's built-in env
}

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firestore
if (!admin.apps.length) {
  // Try using FIREBASE_SERVICE_ACCOUNT from environment
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
    : undefined;

  admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || "login-d9d7f"
  });
}

const db = admin.firestore();

if (!process.env.RAZORPAY_KEY_ID) {
  console.warn("⚠️ RAZORPAY_KEY_ID is missing in environment variables.");
}

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
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // 1. HEADER (Logo & Brand Info)
    doc.roundedRect(50, 40, 40, 40, 8).fill('#ea580c');
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('F', 50, 48, { width: 40, align: 'center' });
    
    doc.fillColor('#ea580c').fontSize(22).text('MAGIZHAMUDHU Kitchen', 105, 42);
    doc.fillColor('#6b7280').fontSize(10).font('Helvetica').text('Deliciously Delivered', 105, 66);
    doc.fillColor('#9ca3af').fontSize(9).text('📧 support@magizhamudhu.com', 105, 80);

    // Separator line
    doc.strokeColor('#f3f4f6').lineWidth(2).moveTo(50, 110).lineTo(545, 110).stroke();
    doc.moveDown(2);

    // 2. ORDER INFO (Two Columns)
    const topInfoY = 130;
    
    // Left side: Billing / Customer
    doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text('Invoice To:', 50, topInfoY);
    doc.font('Helvetica').fontSize(10).fillColor('#4b5563');
    doc.text(`Customer: ${order.userName || 'Guest'}`, 50, topInfoY + 18);
    
    // Handle long addresses gracefully
    doc.text(`Address: ${order.address || 'N/A'}`, 50, topInfoY + 33, { width: 220 });
    
    let phoneY = doc.y + 5;
    const phoneNum = order.addressDetails?.phone || order.phone;
    if (phoneNum) {
      doc.text(`Phone: ${phoneNum}`, 50, phoneY);
    }

    // Right side: Order Meta
    doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text('Order Summary:', 320, topInfoY);
    
    // Box for Invoice Number
    doc.roundedRect(320, topInfoY + 16, 220, 22, 4).fill('#fff7ed');
    doc.fillColor('#ea580c').font('Helvetica-Bold').fontSize(10);
    // order.id fallback just in case
    const shortId = (order.id || Date.now().toString()).slice(-6).toUpperCase();
    doc.text(`Invoice #: INV-${shortId}`, 330, topInfoY + 22);

    doc.font('Helvetica').fontSize(10).fillColor('#4b5563');
    doc.text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}`, 320, topInfoY + 48);
    doc.text(`Payment Mode: ${order.paymentMethod || 'Online'}`, 320, topInfoY + 63);
    doc.text(`Status: ${order.status || 'Paid'}`, 320, topInfoY + 78);

    doc.strokeColor('#f3f4f6').lineWidth(1).moveTo(50, 240).lineTo(545, 240).stroke();

    // 3. TABLE BODY
    const tableTop = 260;
    
    doc.roundedRect(50, tableTop, 495, 25, 4).fill('#f9fafb');
    doc.fillColor('#374151').font('Helvetica-Bold').fontSize(10);
    doc.text('Item Description', 65, tableTop + 8);
    doc.text('Qty', 330, tableTop + 8, { width: 30, align: 'center' });
    doc.text('Price', 390, tableTop + 8, { width: 60, align: 'right' });
    doc.text('Subtotal', 470, tableTop + 8, { width: 60, align: 'right' });

    let y = tableTop + 35;
    doc.font('Helvetica').fillColor('#1f2937');
    
    if (order.items && order.items.length > 0) {
      order.items.forEach((item, index) => {
          const itemSubtotal = item.quantity * item.price;
          doc.text(item.name, 65, y, { width: 250 });
          doc.text(item.quantity.toString(), 330, y, { width: 30, align: 'center' });
          // Using Rs. because default PDFKit font lacks ₹ symbol
          doc.text(`Rs. ${item.price.toFixed(2)}`, 390, y, { width: 60, align: 'right' });
          doc.text(`Rs. ${itemSubtotal.toFixed(2)}`, 470, y, { width: 60, align: 'right' });
          
          y += Math.max(20, doc.heightOfString(item.name, { width: 250 }) + 5);
          
          if (index < order.items.length - 1) {
              doc.strokeColor('#f3f4f6').lineWidth(0.5).moveTo(50, y - 5).lineTo(545, y - 5).stroke();
          }
      });
    }

    // 4. HIGHLIGHT TOTAL SECTION
    const totalsTop = Math.max(y + 10, 350);
    doc.strokeColor('#e5e7eb').lineWidth(1.5).moveTo(300, totalsTop).lineTo(545, totalsTop).stroke();
    
    const subtotalTop = totalsTop + 15;
    doc.font('Helvetica').fontSize(10).fillColor('#6b7280');
    doc.text('Subtotal:', 350, subtotalTop);
    doc.fillColor('#111827').text(`Rs. ${Number(order.totalAmount).toFixed(2)}`, 450, subtotalTop, { width: 80, align: 'right' });

    const deliveryTop = subtotalTop + 20;
    doc.fillColor('#6b7280').text('Delivery Fee:', 350, deliveryTop);
    doc.fillColor('#10b981').text('FREE', 450, deliveryTop, { width: 80, align: 'right' });
    
    // Total Shaded Box
    const finalTotalTop = deliveryTop + 20;
    doc.roundedRect(300, finalTotalTop - 5, 245, 34, 6).fill('#fff7ed');
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#ea580c');
    doc.text('Total Amount:', 320, finalTotalTop + 5);
    doc.text(`Rs. ${Number(order.totalAmount).toFixed(2)}`, 420, finalTotalTop + 5, { width: 110, align: 'right' });

    // 5. PROFESSIONAL FOOTER
    const footerTop = 720;
    doc.strokeColor('#f3f4f6').lineWidth(2).moveTo(50, footerTop - 15).lineTo(545, footerTop - 15).stroke();
    
    doc.fillColor('#ea580c').font('Helvetica-Bold').fontSize(11);
    doc.text('Thank you for ordering with MAGIZHAMUDHU \u2764\uFE0F', 50, footerTop, { align: 'center' });
    
    doc.fillColor('#6b7280').font('Helvetica').fontSize(9);
    doc.text('Follow us: Instagram @magizhamudhu | WhatsApp +91 98765 43210', 50, footerTop + 20, { align: 'center' });
    doc.text('Return/Support inquiries: support@magizhamudhu.com', 50, footerTop + 35, { align: 'center' });

    doc.end();

    writeStream.on("finish", () => resolve(filePath));
    writeStream.on("error", reject);
  });
}

// SMS Helper Function
async function sendOrderSMS(phone, orderId, amount, userName) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.AccountSID;
  const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.AuthToken;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER || process.env.MyTwiliophonenumber;

  if (!accountSid || !authToken || !twilioPhone) {
    console.warn("⚠️ Twilio credentials missing. SMS skipped.");
    return;
  }

  if (!phone) {
    console.warn("⚠️ No phone number provided for SMS.");
    return;
  }

  let formattedPhone = phone.replace(/[\s\-\(\)]/g, '').trim();
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+91' + formattedPhone; 
  }

  const message = `Hi ${userName}, your order #${orderId.slice(-6)} for Rs.${amount} is confirmed. Thank you for choosing MAGIZHAMUDHU Kitchen!`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({
    To: formattedPhone,
    From: twilioPhone,
    Body: message
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log("✅ SMS sent successfully! SID:", data.sid, "To:", formattedPhone);
    } else {
      console.error("❌ Twilio API Error:", data.message, "Full Error:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("❌ Network/Twilio Connection Error:", err.message);
  }
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

    // Send SMS
    const phone = orderData.addressDetails?.phone || orderData.phone;
    console.log("📢 Attempting SMS to:", phone, "for COD order:", orderId);
    if (phone) {
      await sendOrderSMS(phone, orderId, orderData.totalAmount, orderData.userName);
    } else {
      console.warn("⚠️ Skipping SMS: No phone number found in order data.");
    }

    res.json({ success: true, message: "Email and SMS processed" });
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

    // Signature verified!
    // Since backend lacks service account, client will handle Firestore save & email.
    
    // Optionally trigger SMS if orderData is present
    if (orderData) {
      const phone = orderData.addressDetails?.phone || orderData.phone;
      const orderId = orderData.id || razorpay_order_id;
      if (phone) {
         await sendOrderSMS(phone, orderId, orderData.totalAmount, orderData.userName);
      }
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
