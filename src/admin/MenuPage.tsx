import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadImage } from '../services/imageService';
import { MenuItem } from '../types';
import { Plus, Edit2, Trash2, Upload, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminTheme } from './ThemeContext';

export default function MenuPage({ userRole }: { userRole: string }) {
  const isDark = useAdminTheme();
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2e8f0';
  const inputBg = isDark ? '#0f172a' : '#f8fafc';
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<'Veg' | 'Non-Veg' | 'Drinks'>('Veg');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [pastedUrl, setPastedUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [stock, setStock] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'menu'), (snap) => {
      setMenu(snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));
    });
    return () => unsub();
  }, []);

  const openForm = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setPrice(String(item.price));
      setCategory(item.category);
      setDescription(item.description);
      setPastedUrl(item.imageUrl);
      setIsAvailable(item.isAvailable !== false);
      setStock(item.stock !== undefined ? String(item.stock) : '');
    } else {
      setEditingItem(null);
      setName('');
      setPrice('');
      setCategory('Veg');
      setDescription('');
      setPastedUrl('');
      setIsAvailable(true);
      setStock('');
    }
    setImage(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin' && userRole !== 'manager') {
      toast.error('Only admins or managers can modify menu');
      return;
    }
    const id = toast.loading('Initializing connection...');
    setUploading(true);
    console.group("🚀 Menu Save Diagnostic");
    
    try {
      let finalImageUrl = pastedUrl.trim() || editingItem?.imageUrl || '';
      
      // Only upload if no URL is pasted and a file is selected
      if (image && !pastedUrl.trim()) {
        toast.loading(`Uploading image: ${image.name}...`, { id });
        try {
          // Increase timeout to 30 seconds for slower networks
          const uploadPromise = uploadImage(image);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("IMAGE_UPLOAD_TIMEOUT")), 30000)
          );
          
          finalImageUrl = await Promise.race([uploadPromise, timeoutPromise]) as string;
          console.log("✅ Image Upload Success:", finalImageUrl);
        } catch (uploadErr: any) {
          console.error("❌ Image Upload Failed:", uploadErr);
          
          if (uploadErr.message === "IMAGE_UPLOAD_TIMEOUT") {
            toast.error('Upload timed out after 30s. Item saved with a placeholder. Check your internet speed.', { duration: 6000 });
          } else {
            // Very likely a Firebase Config/Permission issue
            toast.error(`Firebase Error: ${uploadErr.code || uploadErr.message}. Make sure "Storage" is enabled in your Firebase Console.`, { duration: 8000 });
          }
          
          // Reliable placeholder
          finalImageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1000';
          console.log("⚠️ Falling back to placeholder image");
        }
      }

      const cleanPrice = Number(price);
      if (isNaN(cleanPrice) || cleanPrice <= 0) {
        throw new Error("Please enter a valid price greater than 0");
      }

      if (!finalImageUrl) {
        throw new Error("No image provided. Please upload an image or edit an existing one.");
      }

      const itemData = {
        name: name.trim(),
        price: cleanPrice,
        category,
        description: description.trim(),
        imageUrl: finalImageUrl,
        isAvailable,
        stock: stock.trim() !== '' ? parseInt(stock) : null,
        rating: editingItem?.rating || 4.5
      };

      toast.loading('Saving to Database...', { id });
      console.log("📡 Sending data to Firestore:", itemData);

      if (editingItem) {
        await updateDoc(doc(db, 'menu', editingItem.id), itemData);
        toast.success('Menu updated successfully!', { id });
      } else {
        const docRef = await addDoc(collection(db, 'menu'), { 
          ...itemData, 
          createdAt: serverTimestamp() 
        });
        console.log("🎉 Success! Doc ID:", docRef.id);
        toast.success('Added to menu!', { id });
      }
      
      setIsModalOpen(false);
      // Reset form if it was a new item
      if (!editingItem) {
        setName('');
        setPrice('');
        setDescription('');
        setPastedUrl('');
        setImage(null);
      }
    } catch(err: any) {
      console.error("❌ CRITICAL FAILURE:", err);
      // Detailed error for the user to troubleshoot
      const errMsg = err.message || 'Check your internet or Firebase console.';
      toast.error(`Failed to save: ${errMsg}`, { id });
    } finally {
      setUploading(false);
      console.groupEnd();
    }
  };

  const handleDelete = async (id: string) => {
    if (userRole !== 'admin') return toast.error('Only admins can delete');
    if (confirm('Delete this item?')) {
      await deleteDoc(doc(db, 'menu', id));
      toast.success('Item removed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {menu.map(m => (
          <div key={m.id}
            className="rounded-xl overflow-hidden shadow-lg flex flex-col group transition-all hover:-translate-y-1 border"
            style={{ background: cardBg, borderColor: cardBorder }}
          >
            <div className="h-40 w-full relative">
              <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                 <button onClick={() => openForm(m)} className="p-3 bg-white/20 hover:bg-white text-white hover:text-slate-900 rounded-full backdrop-blur-sm transition-all shadow-lg"><Edit2 size={20}/></button>
                 <button onClick={() => handleDelete(m.id)} className="p-3 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-all shadow-lg"><Trash2 size={20}/></button>
              </div>
              <span className={`absolute top-2 right-2 px-3 py-1 text-xs font-bold rounded-full ${m.category === 'Veg'? 'bg-green-500 text-white' : m.category === 'Non-Veg'? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                {m.category}
              </span>
            </div>
            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-bold text-lg truncate mb-1" style={{ color: textPrimary }}>{m.name}</h3>
              <p className="text-orange-500 font-bold text-xl mb-3">₹{m.price}</p>
              <div className="mt-auto flex justify-between items-center text-sm font-medium">
                <span className={m.isAvailable !== false ? 'text-green-400' : 'text-slate-500'}>
                  {m.isAvailable !== false ? '• In Stock' : '• Unavailable'}
                </span>
                {m.stock !== undefined && m.stock !== null && (
                  <span className="text-blue-400 ml-2">({m.stock} left)</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {userRole === 'admin' && (
        <button onClick={() => openForm()} className="fixed bottom-10 right-10 bg-orange-500 hover:bg-orange-600 text-white p-5 rounded-full shadow-2xl shadow-orange-500/30 transition-all hover:scale-110 flex items-center justify-center z-40">
          <Plus size={32} />
        </button>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl p-6 border"
            style={{ background: cardBg, borderColor: cardBorder }}
          >
            <div className="flex justify-between items-center mb-6 border-b pb-4" style={{ borderColor: cardBorder }}>
              <h3 className="font-bold text-xl" style={{ color: textPrimary }}>{editingItem ? 'Edit Item' : 'New Menu Item'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="hover:text-orange-500" style={{ color: textPrimary }} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <input type="text" placeholder="Item Name" value={name} onChange={e=>setName(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl outline-none border focus:border-orange-500"
                style={{ background: inputBg, color: textPrimary, borderColor: cardBorder }} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Price (₹)" value={price} onChange={e=>setPrice(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl outline-none border focus:border-orange-500"
                  style={{ background: inputBg, color: textPrimary, borderColor: cardBorder }} />
                <select value={category} onChange={e=>setCategory(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl outline-none border focus:border-orange-500"
                  style={{ background: inputBg, color: textPrimary, borderColor: cardBorder }}>
                  <option value="Veg">Veg</option>
                  <option value="Non-Veg">Non-Veg</option>
                  <option value="Drinks">Drinks</option>
                </select>
              </div>
              <textarea placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl outline-none border focus:border-orange-500 min-h-[100px]"
                style={{ background: inputBg, color: textPrimary, borderColor: cardBorder }} />
              <div className="flex items-center gap-4">
                 <input type="checkbox" id="avail" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} className="w-5 h-5 accent-orange-500" />
                 <label htmlFor="avail" className="font-medium cursor-pointer" style={{ color: textPrimary }}>Available in Menu</label>
              </div>
              <div>
                <input type="number" placeholder="Stock Quantity (Leave empty for infinite)" value={stock} onChange={e => setStock(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none border focus:border-orange-500"
                  style={{ background: inputBg, color: textPrimary, borderColor: cardBorder }} />
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <input type="text" placeholder="Paste Image URL (Faster)" value={pastedUrl} onChange={e => setPastedUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none border focus:border-orange-500 text-sm"
                    style={{ background: inputBg, color: textPrimary, borderColor: cardBorder }} />
                </div>
                <div className="relative border-2 border-dashed hover:border-orange-500 transition-colors rounded-xl h-20 flex items-center justify-center group"
                  style={{ borderColor: cardBorder, background: inputBg }}>
                  <input type="file" onChange={e => { setImage(e.target.files?.[0] || null); setPastedUrl(''); }} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                  <div className="flex flex-col items-center">
                    <Upload className="text-slate-500 mb-1 group-hover:text-orange-500 transition-colors" size={18} />
                    <span className="text-[10px] text-slate-500">{image ? image.name : 'Or Upload File (Optional)'}</span>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={uploading} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 mt-4 transition-colors shadow-lg shadow-orange-500/20">
                <Save size={20}/> {uploading ? 'Processing...' : 'Save Item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
