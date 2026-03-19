import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Order } from '../types';
import Table from '../components/Table';
import toast from 'react-hot-toast';

export default function OrdersPage({ userRole }: { userRole: string }) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
    return () => unsub();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
      toast.success(`Order status: ${status}`);
    } catch(e) {
      toast.error('Failed to update status');
    }
  };

  const statusColors = {
    'Pending': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    'Preparing': 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    'Out for Delivery': 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    'Delivered': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    'Cancelled': 'text-red-500 bg-red-500/10 border-red-500/20',
  };

  const columns = [
    { key: 'id', header: 'Order ID', render: (o: Order) => <span className="font-mono text-xs text-slate-400">#{o.id.slice(-6)}</span> },
    { key: 'contact', header: 'Customer', render: (o: Order) => (
      <div>
         <p className="font-medium text-white">{o.userId.slice(0, 8)}...</p>
         <p className="text-xs text-slate-500 truncate w-40">{o.items.length} items ({o.items.map(i=>i.name).join(', ')})</p>
      </div>
    )},
    { key: 'totalAmount', header: 'Amount (₹)', render: (o: Order) => <span className="font-bold text-white">₹{o.totalAmount}</span> },
    { key: 'status', header: 'Status', render: (o: Order) => (
      <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border ${statusColors[o.status as keyof typeof statusColors] || 'text-slate-400'}`}>
        {o.status}
      </span>
    )},
    { key: 'actions', header: 'Action', render: (o: Order) => (
       <select 
          value={o.status}
          onChange={(e) => updateStatus(o.id, e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-2 py-1 outline-none focus:border-orange-500 cursor-pointer"
       >
          <option value="Pending">Pending</option>
          <option value="Preparing">Preparing</option>
          <option value="Out for Delivery">Out for Delivery</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
       </select>
    )}
  ];

  return (
    <div className="space-y-6">
       <Table data={orders} columns={columns} keyExtractor={o => o.id} />
    </div>
  );
}
