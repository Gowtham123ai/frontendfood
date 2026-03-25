import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Order } from '../types';
import Card from '../components/Card';
import { Truck, MapPin, Phone, Package, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminTheme } from './ThemeContext';

export default function DeliveryPage() {
  const isDark = useAdminTheme();
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textMuted   = isDark ? '#94a3b8' : '#64748b';
  const [activeDeliveries, setActiveDeliveries] = useState<Order[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', 'in', ['Preparing', 'Out for Delivery']));
    const unsub = onSnapshot(q, (snap) => {
      setActiveDeliveries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
    return () => unsub();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status: newStatus });
      toast.success(`Marked as ${newStatus}`);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeDeliveries.map(order => (
          <Card key={order.id} className="border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: textMuted }}>Order ID</p>
                <h4 className="font-mono text-sm" style={{ color: textPrimary }}>#{order.id.slice(-8)}</h4>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-bold ${order.status === 'Preparing' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                {order.status}
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-slate-500 mt-1 shrink-0" />
                <p className="text-sm line-clamp-2" style={{ color: textMuted }}>
                  {typeof order.address === 'string' ? order.address : (order.address as any)?.address || 'Address details in order'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-slate-500 shrink-0" />
                <p className="text-sm" style={{ color: textMuted }}>Customer Contact Hidden</p>
              </div>
              <div className="flex items-center gap-3">
                <Package size={16} className="text-slate-500 shrink-0" />
                <p className="text-sm font-bold" style={{ color: textPrimary }}>₹{order.totalAmount}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {order.status === 'Preparing' ? (
                <button 
                  onClick={() => updateStatus(order.id, 'Out for Delivery')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Truck size={14} /> Start Delivery
                </button>
              ) : (
                <button 
                  onClick={() => updateStatus(order.id, 'Delivered')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={14} /> Mark Delivered
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {activeDeliveries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed"
          style={{ background: isDark ? 'rgba(30,41,59,0.5)' : '#fafaf8', borderColor: isDark ? '#334155' : '#e2e8f0' }}>
            <Truck size={48} className="text-slate-500 mb-4" />
            <p className="font-medium" style={{ color: textMuted }}>No active deliveries at the moment</p>
        </div>
      )}
    </div>
  );
}
