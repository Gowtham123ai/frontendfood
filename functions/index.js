require('dotenv').config();
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const os = require("os");

admin.initializeApp();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS,
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

exports.createOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  try {
    const options = {
      amount: Math.round(data.amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error("Razorpay Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to create Razorpay Order", error);
  }
});

exports.verifyPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { order_id, payment_id, signature, orderData } = data;

  if (!order_id || !payment_id || !signature || !orderData) {
    throw new functions.https.HttpsError("invalid-argument", "Missing parameters.");
  }

  const generated_signature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(order_id + "|" + payment_id)
    .digest("hex");

  if (generated_signature !== signature) {
    throw new functions.https.HttpsError("permission-denied", "Payment verification failed.");
  }

  try {
    // 1. Save to DB
    const finalOrder = {
      ...orderData,
      id: order_id,
      paymentId: payment_id,
      status: 'Pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await admin.firestore().collection("orders").doc(order_id).set(finalOrder);

    // 2. Generate Invoice
    const tempFilePath = path.join(os.tmpdir(), `invoice_${order_id}.pdf`);
    await createInvoicePDF(finalOrder, tempFilePath);

    // 3. Send Email
    await transporter.sendMail({
      from: `"MAGIZHAMUDHU Kitchen" <${GMAIL_USER}>`,
      to: context.auth.token.email || orderData.email,
      subject: "Your MAGIZHAMUDHU Order Invoice \uD83C\uDF5B",
      text: `Hi ${orderData.userName}, thank you for your order! Attached is your invoice for Order #${order_id.slice(-6)}.`,
      attachments: [{ filename: `Invoice_${order_id.slice(-6)}.pdf`, path: tempFilePath }],
    });

    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

    return { success: true };
  } catch (error) {
    console.error("Processing Error:", error);
    throw new functions.https.HttpsError("internal", "Order processed but invoice delivery failed.", error);
  }
});
