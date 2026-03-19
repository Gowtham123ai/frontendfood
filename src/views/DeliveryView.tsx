import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { motion } from 'framer-motion';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Package, Truck, CheckCircle2, MapPin, Phone, ExternalLink, Clock } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import toast from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function DeliveryView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('Active');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getEstimatedTimeInfo = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const estimatedArrival = addMinutes(createdDate, 45);
    const diffInMinutes = Math.round((estimatedArrival.getTime() - currentTime.getTime()) / 60000);
    
    const start = addMinutes(createdDate, 30);
    const end = addMinutes(createdDate, 45);
    const timeRange = `${format(start, 'p')} - ${format(end, 'p')}`;

    return {
      timeRange,
      remainingMins: diffInMinutes,
      progress: Math.min(100, Math.max(0, ((currentTime.getTime() - createdDate.getTime()) / (45 * 60000)) * 100))
    };
  };

  useEffect(() => {
    const statuses = statusFilter === 'Active' 
      ? ['Pending', 'Preparing', 'Out for Delivery']
      : [statusFilter];

    const q = query(
      collection(db, 'orders'),
      where('status', 'in', statuses),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    return () => unsubscribe();
  }, [statusFilter]);

  useEffect(() => {
    let watchId: number;
    
    const activeOrder = orders.find(o => 
      o.status === 'Out for Delivery' && 
      o.deliveryBoyId === auth.currentUser?.uid
    );

    if (activeOrder && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          try {
            await updateDoc(doc(db, 'orders', activeOrder.id), {
              location: {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              }
            });
          } catch (err) {
            console.error("Location update failed:", err);
          }
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [orders]);

  const handleOrderAction = async (orderId: string, newStatus: Order['status'], assignToMe: boolean = false) => {
    try {
      const updateData: any = { status: newStatus };
      if (assignToMe && auth.currentUser) {
        updateData.deliveryBoyId = auth.currentUser.uid;
      }
      
      await updateDoc(doc(db, 'orders', orderId), updateData);
      toast.success(`Order ${statusFilter === 'Active' ? 'updated' : newStatus.toLowerCase()}!`);
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  if (loading) return <div className="py-20 text-center text-stone-500">Loading active deliveries...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">Delivery Dashboard</h2>
          <p className="text-stone-500 text-sm mt-1">Manage and track your active deliveries</p>
        </div>
        <div className="bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full text-sm font-bold">
          {orders.length} {statusFilter} Orders
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['Active', 'Pending', 'Preparing', 'Out for Delivery', 'Delivered'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              statusFilter === status
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                : 'bg-white text-stone-500 border border-stone-100 hover:border-emerald-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="grid gap-6">
        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
            <p className="text-stone-400">No {statusFilter.toLowerCase()} orders found</p>
          </div>
        ) : (
          orders.map((order) => (
            <motion.div
              layout
              key={order.id}
              className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <div>
                  <p className="text-xs text-stone-400 font-mono uppercase">Order #{order.id.slice(-6)}</p>
                  <p className="text-sm text-stone-500">{format(new Date(order.createdAt), 'p')}</p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                  order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                  order.status === 'Out for Delivery' ? 'bg-amber-50 text-amber-600' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  <Package size={14} />
                  {order.status}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="text-emerald-600 mt-1 flex-shrink-0" size={20} />
                  <div>
                    <p className="font-bold text-stone-900">Delivery Address</p>
                    <p className="text-stone-500 text-sm">{order.address}</p>
                  </div>
                </div>

                {order.status !== 'Delivered' && (
                  <div className="flex items-start gap-3">
                    <Clock className="text-amber-600 mt-1 flex-shrink-0" size={20} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-stone-900">Estimated Delivery</p>
                          <p className="text-stone-500 text-sm">{getEstimatedTimeInfo(order.createdAt).timeRange}</p>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          getEstimatedTimeInfo(order.createdAt).remainingMins < 5 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {getEstimatedTimeInfo(order.createdAt).remainingMins > 0 
                            ? `${getEstimatedTimeInfo(order.createdAt).remainingMins} mins left`
                            : 'Overdue'}
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${getEstimatedTimeInfo(order.createdAt).progress}%` }}
                          className={`h-full rounded-full ${
                            getEstimatedTimeInfo(order.createdAt).progress > 90 ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-stone-50 p-4 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-stone-400 uppercase">Items</p>
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  {order.deliveryBoyId === auth.currentUser?.uid && order.status === 'Out for Delivery' ? (
                    <button
                      onClick={() => handleOrderAction(order.id, 'Delivered')}
                      className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                      <CheckCircle2 size={18} />
                      Complete Delivery
                    </button>
                  ) : order.status === 'Preparing' || order.status === 'Pending' ? (
                    <button
                      onClick={() => handleOrderAction(order.id, 'Out for Delivery', true)}
                      className="flex-1 bg-orange-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-700 shadow-lg shadow-orange-500/20 active:scale-95"
                    >
                      <Truck size={18} />
                      Accept & Start Delivery
                    </button>
                  ) : null}
                  
                  {order.deliveryBoyId && order.deliveryBoyId !== auth.currentUser?.uid && (
                    <div className="w-full py-3 px-4 bg-slate-800/50 rounded-xl border border-slate-700 text-slate-500 text-xs font-bold text-center">
                      Assigned to Another Rider
                    </div>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-all"
                  >
                    <ExternalLink size={20} />
                  </a>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
