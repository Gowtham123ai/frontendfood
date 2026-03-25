import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, User, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Address } from '../types';
import toast from 'react-hot-toast';

export default function AddressView() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  // FIX 2: FETCH USER ADDRESSES ONLY
  const fetchAddresses = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, 'addresses'), 
        where('userId', '==', auth.currentUser.uid)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Address));
      
      setAddresses(data);
      if (data.length === 0) setShowForm(true);
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  // FIX 1: SAVE ADDRESS CORRECTLY
  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
       toast.error("Please login to save address");
       return;
    }
    if (!form.name || !form.phone || !form.address) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const newAddress = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        userId: auth.currentUser.uid, // IMPORTANT
        createdAt: new Date()
      };
      
      await addDoc(collection(db, 'addresses'), newAddress);
      
      toast.success('Address Saved ✅');
      setForm({ name: '', phone: '', address: '' });
      setShowForm(false);
      
      // FIX 4: AUTO REFRESH AFTER SAVE
      fetchAddresses(); 
    } catch (err: any) {
      console.error("Save Error:", err);
      toast.error(`Error: ${err.message}`);
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'addresses', id));
      toast.success('Address deleted');
      fetchAddresses();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete address');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Delivery Addresses</h2>
          <p className="mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>Manage your delivery locations</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-orange-500 text-white p-4 rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={saveAddress}
            className="p-8 rounded-[2.5rem] border shadow-2xl space-y-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-orange-500 transition-colors" size={20} style={{ color: 'var(--text-muted)' }} />
                <input
                  placeholder="Full Name"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 border rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-orange-500 transition-colors" size={20} style={{ color: 'var(--text-muted)' }} />
                <input
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 border rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="relative group">
                <MapPin className="absolute left-4 top-4 group-focus-within:text-orange-500 transition-colors" size={20} style={{ color: 'var(--text-muted)' }} />
                <textarea
                  placeholder="Street Address, Area, Landmark"
                  value={form.address}
                  onChange={e => setForm({...form, address: e.target.value})}
                  className="w-full pl-12 pr-4 py-4 border rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all min-h-[120px]"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-800 text-white py-4 rounded-2xl font-bold hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20"
              >
                Save Address
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-12 text-slate-600 font-bold animate-pulse">Loading addresses...</div>
        ) : addresses.length === 0 ? (
          // FIX 3: SHOW NO SAVED ADDRESSES FOUND
          <div className="border-2 border-dashed rounded-[2.5rem] p-12 text-center font-bold"
               style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            No saved addresses found 📍
          </div>
        ) : (
          // FIX 3: SHOW ADDRESS CARDS
          addresses.map((addr) => (
            <motion.div
              layout
              key={addr.id}
              className="group p-6 rounded-3xl border hover:border-orange-500 transition-all flex justify-between items-start"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-orange-500 border" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{addr.name}</h4>
                  <p className="font-medium text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{addr.phone}</p>
                  <p className="text-sm mt-3 leading-relaxed max-w-sm" style={{ color: 'var(--text-muted)' }}>{addr.address}</p>
                </div>
              </div>
              <button 
                onClick={() => deleteAddress(addr.id)}
                className="p-3 text-slate-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={20} />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
