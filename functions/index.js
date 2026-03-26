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

// Firebase Native approach: Firestore trigger to automatically send SMS on new orders!
exports.sendSMSOnOrder = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const orderData = snap.data();
    const orderId = context.params.orderId;
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.AccountSID;
    const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.AuthToken;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER || process.env.MyTwiliophonenumber;

    if (!accountSid || !authToken || !twilioPhone) {
      console.log("Twilio credentials missing. SMS skipped.");
      return null;
    }

    const phone = orderData.addressDetails?.phone || orderData.phone || orderData.address?.phone;
    if (!phone) {
      console.log("No phone number found in order to send SMS.");
      return null;
    }

    let formattedPhone = phone.replace(/[\s\-\(\)]/g, '').trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone; 
    }

    const message = `Hi ${orderData.userName || 'Customer'}, your order #${orderId.slice(-6)} for Rs.${orderData.totalAmount} is confirmed. Thank you for choosing MAGIZHAMUDHU Kitchen!`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams();
    params.append('To', formattedPhone);
    params.append('From', twilioPhone);
    params.append('Body', message);

    try {
      // Node 18+ has built-in fetch
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      
      if (response.ok) {
        console.log("✅ Firebase triggered SMS sent to:", formattedPhone);
      } else {
        const data = await response.json();
        console.error("❌ Firebase Twilio SMS failed:", data);
      }
    } catch (err) {
      console.error("❌ Firebase SMS Error:", err);
    }
    
    return null;
  });
