import React, { useState, useEffect } from 'react';
import { CartItem, UserProfile, Address } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, CreditCard, MapPin, ArrowRight, ShoppingBag, Truck, CheckCircle2 } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import toast from 'react-hot-toast';

interface CartViewProps {
  cart: CartItem[];
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckoutSuccess: () => void;
  user: UserProfile | null;
  onNavigate: (view: string) => void;
}

export default function CartView({ cart, onUpdateQty, onRemove, onCheckoutSuccess, user, onNavigate }: CartViewProps) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000');

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryFee = subtotal > 500 ? 0 : 40;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const q = query(collection(db, 'addresses'), where('userId', '==', user?.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Address));
      setSavedAddresses(data);
      if (data.length > 0) setSelectedAddress(data[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const placeOrderCOD = async () => {
    try {
      if (!user) {
        toast.error("Login required");
        return;
      }

      if (!selectedAddress) {
        toast.error("Please select address");
        return;
      }

      setLoading(true);
      toast.loading('Placing your COD order...', { id: 'checkout' });

      const docRef = await addDoc(collection(db, "orders"), {
        userId: user.uid,
        userName: user.name,
        email: user.email,
        items: cart,
        totalAmount: total,
        paymentMethod: "COD",
        status: "Pending",
        address: selectedAddress.address,
        addressDetails: selectedAddress,
        createdAt: new Date(),
      });

      const orderData = {
        id: docRef.id,
        userId: user.uid,
        userName: user.name,
        email: user.email,
        items: cart,
        totalAmount: total,
        paymentMethod: "COD",
        address: selectedAddress.address,
        addressDetails: selectedAddress
      };

      const res = await fetch(`${API_URL}/send-cod-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!res.ok) console.error('Failed to send email bill (non-fatal)');

      // Decrease stock
      for (const item of cart) {
        if (item.stock !== undefined && item.stock !== null) {
          const newStock = Math.max(0, item.stock - item.quantity);
          await updateDoc(doc(db, 'menu', item.id), { stock: newStock }).catch(e => console.error("Stock update failed", e));
        }
      }

      toast.success("✅ Order placed & Bill sent to your email!", { id: 'checkout' });
      onCheckoutSuccess();
    } catch (err) {
      console.error(err);
      toast.error("❌ Checkout failed", { id: 'checkout' });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to checkout');
      return;
    }
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        userId: user.uid,
        userName: user.name,
        email: user.email,
        items: cart,
        totalAmount: total,
        address: selectedAddress.address,
        addressDetails: selectedAddress,
        paymentMethod: paymentMethod === 'cod' ? 'COD' : 'Online'
      };

      if (paymentMethod === 'cod') {
        await placeOrderCOD();
      } else {
        toast.loading('Initiating secure payment...', { id: 'payment' });

        const createOrderRes = await fetch(`${API_URL}/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total })
        });
        
        if (!createOrderRes.ok) {
          const errorData = await createOrderRes.json().catch(() => ({}));
          console.error('Backend order creation failed:', errorData);
          throw new Error('Failed to create order on server');
        }

        const order = await createOrderRes.json();
        
        if (!order || !order.id) {
          console.error('Invalid order received from backend:', order);
          throw new Error('Invalid order response');
        }


        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: total * 100,
          currency: "INR",
          name: "MAGIZHAMUDHU Kitchen",
          description: "Food Order Payment",
          order_id: order.id,
          handler: async (response: any) => {
            try {
              toast.loading('Verifying payment...', { id: 'payment' });

              const verifyRes = await fetch(`${API_URL}/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderData
                })
              });

              if (!verifyRes.ok) throw new Error('Verification failed');

              // Decrease stock
              for (const item of cart) {
                if (item.stock !== undefined && item.stock !== null) {
                  const newStock = Math.max(0, item.stock - item.quantity);
                  await updateDoc(doc(db, 'menu', item.id), { stock: newStock }).catch(e => console.error("Stock update failed", e));
                }
              }

              toast.success('Payment Verified & Invoice Sent! ✅', { id: 'payment' });
              onCheckoutSuccess();
            } catch (err) {
              console.error(err);
              toast.error('Payment Verification failed.', { id: 'payment' });
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone || ""
          },
          theme: { color: "#ff6b00" }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        toast.dismiss('payment');
      }
    } catch (error) {
      console.error(error);
      toast.error('Checkout failed. Please try again.', { id: 'payment' });
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 mb-6 border border-slate-800">
          <ShoppingBag size={48} />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Your cart is empty</h2>
        <p className="text-slate-500 mt-2">Add some delicious items to get started! 🍛</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
      <div className="lg:col-span-2 space-y-8">
        <section>
          <h2 className="text-3xl font-black text-white tracking-tight mb-6">Your Cart</h2>
          <div className="space-y-4">
            {cart.map((item) => (
              <motion.div
                layout
                key={item.id}
                className="flex items-center gap-4 bg-[#111827] p-4 rounded-3xl border border-slate-800 shadow-xl"
              >
                <img
                  src={item.imageUrl || `https://picsum.photos/seed/${item.name}/200/200`}
                  alt={item.name}
                  className="w-20 h-20 rounded-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg truncate tracking-tight">{item.name}</h3>
                  <p className="text-orange-500 font-bold">₹{item.price}</p>
                </div>
                <div className="flex items-center gap-3 bg-[#0b1120] p-1.5 rounded-xl border border-slate-800">
                  <button onClick={() => onUpdateQty(item.id, -1)} className="p-1.5 hover:bg-slate-800 text-slate-400 rounded-lg"><Minus size={14} /></button>
                  <span className="font-black w-6 text-center text-white">{item.quantity}</span>
                  <button onClick={() => onUpdateQty(item.id, 1)} className="p-1.5 hover:bg-slate-800 text-slate-400 rounded-lg"><Plus size={14} /></button>
                </div>
                <button onClick={() => onRemove(item.id)} className="p-2.5 text-slate-600 hover:text-red-500 rounded-xl"><Trash2 size={20} /></button>
              </motion.div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-2xl font-black text-white tracking-tight mb-6">Select Delivery Address</h3>
          {savedAddresses.length === 0 ? (
            <div className="bg-[#111827] p-8 rounded-3xl border-2 border-dashed border-slate-800 text-center">
              <p className="text-slate-500 font-bold mb-4">No saved addresses found.</p>
              <button
                onClick={() => onNavigate('address')}
                className="text-orange-500 font-bold flex items-center justify-center gap-2 mx-auto hover:underline"
              >
                <Plus size={18} /> Add New Address
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => setSelectedAddress(addr)}
                  className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative ${selectedAddress?.id === addr.id ? 'bg-orange-500/10 border-orange-500' : 'bg-[#111827] border-slate-800'}`}
                >
                  {selectedAddress?.id === addr.id && (
                    <div className="absolute top-4 right-4 text-orange-500">
                      <CheckCircle2 size={20} />
                    </div>
                  )}
                  <h4 className="font-bold text-white">{addr.name}</h4>
                  <p className="text-slate-500 text-sm mt-1">{addr.phone}</p>
                  <p className="text-slate-400 text-xs mt-3 leading-relaxed line-clamp-2">{addr.address}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <div className="bg-[#111827] p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-8 sticky top-32">
          <h3 className="font-black text-2xl text-white tracking-tight">Payment Method</h3>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setPaymentMethod('online')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'online' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-[#0b1120] border-slate-800 text-slate-500'}`}
            >
              <CreditCard size={24} />
              <span className="text-xs font-black uppercase">Online</span>
            </button>
            <button
              onClick={() => setPaymentMethod('cod')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cod' ? 'bg-orange-500 border-orange-500 text-white' : 'bg-[#0b1120] border-slate-800 text-slate-500'}`}
            >
              <Truck size={24} />
              <span className="text-xs font-black uppercase">COD</span>
            </button>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800/50">
            <div className="flex justify-between text-slate-500 font-medium text-sm">
              <span>Subtotal</span>
              <span className="text-white font-bold">₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-medium text-sm">
              <span>Delivery Fee</span>
              <span className={deliveryFee === 0 ? 'text-green-500 font-black' : 'text-white font-bold'}>
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
              </span>
            </div>
            <div className="pt-4 flex justify-between items-center">
              <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Total Payable</span>
              <span className="text-3xl font-black text-white">₹{total}</span>
            </div>
          </div>

          <button
            onClick={paymentMethod === 'cod' ? placeOrderCOD : handleCheckout}
            disabled={loading}
            className="w-full bg-[#22c55e] text-white py-5 rounded-2xl font-black text-lg hover:bg-green-500 transform transition-all active:scale-95 shadow-xl shadow-green-600/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {paymentMethod === 'cod' ? <Truck size={24} /> : <CreditCard size={24} />}
            {loading ? 'Processing...' : paymentMethod === 'cod' ? 'Place Order (COD)' : `Pay ₹${total}`}
            <ArrowRight size={24} />
          </button>

          <p className="text-[10px] text-slate-600 text-center uppercase tracking-widest font-black">
            {paymentMethod === 'cod' ? 'Order now, pay on delivery' : 'Secure payment via Razorpay'}
          </p>
        </div>
      </div>
    </div>
  );
}
