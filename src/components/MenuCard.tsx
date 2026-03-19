import React from 'react';
import { MenuItem } from '../types';
import { motion } from 'framer-motion';
import { Star, Plus } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export default function MenuCard({ item, onAddToCart }: MenuCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111827] rounded-2xl overflow-hidden shadow-lg border border-slate-800/50 flex flex-col group transition-all duration-300"
    >
      <div className="relative h-44 overflow-hidden">
        <img 
          src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/400`} 
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg ${
            item.category === 'Veg' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            <span className={`w-2 h-2 rounded-full bg-white ${item.category === 'Veg' ? 'animate-pulse' : ''}`} />
            {item.category === 'Veg' ? 'VEG' : 'NON-VEG'}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-white text-lg leading-tight">{item.name}</h3>
          <div className="flex items-center gap-1 bg-green-900/30 px-1.5 py-0.5 rounded border border-green-500/20">
            <Star size={12} className="text-green-500 fill-green-500" />
            <span className="text-[10px] font-bold text-green-500">{item.rating}</span>
          </div>
        </div>
        
        <p className="text-slate-500 text-xs line-clamp-2 h-8 mb-4">
          {item.description}
        </p>
        
        <div className="mt-auto flex justify-between items-center pt-3 border-t border-slate-800/50">
          <span className="text-orange-500 font-black text-xl">₹{item.price}</span>
          {item.stock !== undefined && item.stock <= 0 ? (
             <span className="text-red-500 font-black text-[10px] uppercase tracking-widest bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 whitespace-nowrap">Out of Stock ❌</span>
          ) : (
            <button
              onClick={() => onAddToCart(item)}
              className="bg-[#ff6b00]/10 text-[#ff6b00] border border-[#ff6b00]/30 px-4 py-1.5 rounded-xl font-bold text-sm hover:bg-[#ff6b00] hover:text-white transition-all transform active:scale-90 flex items-center gap-2 shadow-lg shadow-orange-500/5"
            >
              <Plus size={16} strokeWidth={3} />
              Add
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
