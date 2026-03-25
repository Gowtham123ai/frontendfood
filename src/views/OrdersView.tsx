import React, { useState, useEffect } from 'react';
import { UserProfile, Order } from '../types';
import { motion } from 'framer-motion';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Package, Clock, CheckCircle2, XCircle, MapPin, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import TrackingModal from '../components/TrackingModal';

interface OrdersViewProps {
  user: UserProfile;
}

export default function OrdersView({ user }: OrdersViewProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

  const getOrderDate = (createdAt: any) => {
    if (!createdAt) return new Date();
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000); // Firestore Timestamp
    if (createdAt instanceof Date) return createdAt;
    return new Date(createdAt); // String or other
  };

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      // Sort on client side to avoid specialized index requirement
      ordersData.sort((a, b) => {
        const dateA = getOrderDate(a.createdAt).getTime();
        const dateB = getOrderDate(b.createdAt).getTime();
        return dateB - dateA;
      });

      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const cancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'Cancelled' });
      toast.success("Order cancelled successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to cancel order");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'preparing': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'delivered': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock size={16} />;
      case 'Preparing': return <Package size={16} />;
      case 'Delivered': return <CheckCircle2 size={16} />;
      case 'Cancelled': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading your orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="py-32 text-center">
        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 mx-auto mb-6 border border-slate-800">
           <Package size={32} />
        </div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>No orders yet</h2>
        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Hungry? Place your first order now! 🍛</p>
      </div>
    );
  }


  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <h2 className="text-4xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Order History</h2>
      
      <div className="space-y-8">
        {orders.map((order) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={order.id}
            className="rounded-[2.5rem] border shadow-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="p-8 border-b flex flex-wrap justify-between items-center gap-6"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Order #{order.id.slice(-8)}</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  {format(getOrderDate(order.createdAt), 'PPP p')}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  {order.status}
                </div>
                {order.status === 'Pending' && (
                  <button 
                    onClick={() => cancelOrder(order.id)}
                    className="px-4 py-2.5 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all font-bold text-xs uppercase tracking-widest border border-red-500/20 shadow-lg shadow-red-500/10"
                  >
                    Cancel
                  </button>
                )}
                {order.status !== 'Cancelled' && (
                  <button 
                    onClick={() => setTrackingOrder(order)}
                    className="p-2.5 bg-orange-500/10 text-orange-500 rounded-full hover:bg-orange-500 hover:text-white transition-all border border-orange-500/20 shadow-lg shadow-orange-500/10"
                  >
                    <Navigation size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-2xl border"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-4">
                      <span className="text-orange-500 text-sm font-black w-8 h-8 flex items-center justify-center bg-orange-500/10 rounded-lg">{item.quantity}x</span>
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                    </div>
                    <span className="font-bold" style={{ color: 'var(--text-muted)' }}>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-end gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-slate-400 text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
                    <MapPin size={18} className="mt-1 flex-shrink-0" />
                    <span className="leading-relaxed">
                      {typeof order.address === 'string' ? order.address : (order.address as any)?.address || 'Address details in order'}
                    </span>
                  </div>
                  {order.deliveryTime && (
                    <div className="flex items-center gap-3 text-orange-500 font-bold text-sm bg-orange-500/10 px-4 py-2 rounded-xl inline-flex shadow-inner">
                      <Clock size={16} />
                      Scheduled: {format(new Date(order.deliveryTime), 'PPP p')}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Paid</p>
                  <p className="text-4xl font-black" style={{ color: 'var(--text-primary)' }}>₹{order.totalAmount}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {trackingOrder && (
        <TrackingModal
          isOpen={!!trackingOrder}
          onClose={() => setTrackingOrder(null)}
          orderId={trackingOrder.id}
          status={trackingOrder.status}
        />
      )}
    </div>
  );
}
