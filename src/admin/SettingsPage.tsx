import React, { useState } from 'react';
import Card from '../components/Card';
import { User, Shield, Bell, Globe, Save, Trash2, Key } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
   const [storeName, setStoreName] = useState('MAGIZHAMUDHU Kitchen');
   const [email, setEmail] = useState('admin@admin.com');

   const handleSave = () => {
      toast.success('Configuration saved successfully');
   };

   return (
      <div className="space-y-6 max-w-4xl animate-in fade-in">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <aside className="space-y-2">
               <button className="w-full flex items-center gap-3 px-4 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20">
                  <User size={18} /> General
               </button>
               <button className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 text-slate-400 hover:bg-slate-700 transition-all rounded-xl text-sm font-medium">
                  <Shield size={18} /> Security
               </button>
               <button className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 text-slate-400 hover:bg-slate-700 transition-all rounded-xl text-sm font-medium">
                  <Bell size={18} /> Notifications
               </button>
               <button className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800 text-slate-400 hover:bg-slate-700 transition-all rounded-xl text-sm font-medium">
                  <Globe size={18} /> Integrations
               </button>
            </aside>

            <main className="md:col-span-2 space-y-6">
               <Card title="Store Profile">
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-bold ml-1">KITCHEN NAME</label>
                        <input
                           type="text"
                           value={storeName}
                           onChange={e => setStoreName(e.target.value)}
                           className="w-full px-4 py-3 bg-slate-900 border border-slate-700 text-white rounded-xl outline-none focus:border-orange-500 transition-all"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs text-slate-400 font-bold ml-1">ADMIN EMAIL</label>
                        <input
                           type="email"
                           value={email}
                           onChange={e => setEmail(e.target.value)}
                           className="w-full px-4 py-3 bg-slate-900 border border-slate-700 text-white rounded-xl outline-none focus:border-orange-500 transition-all"
                        />
                     </div>
                     <div className="pt-4">
                        <button
                           onClick={handleSave}
                           className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                        >
                           <Save size={18} /> Save Changes
                        </button>
                     </div>
                  </div>
               </Card>

               <Card title="System Diagnostics">
                  <div className="space-y-4">
                     <p className="text-xs text-slate-500 mb-2">Check if your Firebase services are correctly configured and online.</p>
                     <button
                        onClick={async () => {
                           const id = toast.loading('Testing Firebase connection...');
                           try {
                              // 1. Test Firestore
                              const { doc, setDoc, deleteDoc } = await import('firebase/firestore');
                              const { db } = await import('../firebase');
                              const testDoc = doc(db, '_health', 'test');
                              await setDoc(testDoc, { ping: Date.now() });
                              await deleteDoc(testDoc);
                              console.log('✅ Firestore: OK');

                              // 2. Test Storage
                              const { ref, uploadBytes, deleteObject } = await import('firebase/storage');
                              const { storage } = await import('../firebase');
                              const testRef = ref(storage, '_health_test.txt');
                              await uploadBytes(testRef, new Blob(['ping'], { type: 'text/plain' }));
                              await deleteObject(testRef);
                              console.log('✅ Storage: OK');

                              toast.success('All systems online! Firestore & Storage are correctly configured.', { id });
                           } catch (err: any) {
                              console.error('❌ Diagnostic Failed:', err);
                              toast.error(`Sync Error: ${err.message}. Check if Storage is enabled in Firebase Console.`, { id, duration: 6000 });
                           }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold border border-slate-700 transition-all"
                     >
                        <Shield size={16} className="text-emerald-500" /> Run Connection Test
                     </button>
                  </div>
               </Card>

               <Card title="Advanced Control">
                  <div className="space-y-4">
                     <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-700">
                        <div>
                           <p className="font-bold text-white text-sm">Maintenance Mode</p>
                           <p className="text-xs text-slate-500">Disable customer app temporarily</p>
                        </div>
                        <div className="w-12 h-6 bg-slate-700 rounded-full cursor-pointer relative">
                           <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                        </div>
                     </div>

                     <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-2xl border border-red-500/20">
                        <div>
                           <p className="font-bold text-red-500 text-sm">Clear Analytics Cache</p>
                           <p className="text-xs text-red-500/60">Reset internal graphing metadata</p>
                        </div>
                        <button className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                           <Trash2 size={18} />
                        </button>
                     </div>
                  </div>
               </Card>
            </main>
         </div>
      </div>
   );
}
