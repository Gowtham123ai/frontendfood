import React, { useState } from 'react';
import { MenuItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Plus, Flame, X } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export default function MenuCard({ item, onAddToCart }: MenuCardProps) {
  const [show, setShow] = useState(false);
  const isOutOfStock = item.stock !== undefined && item.stock <= 0;
  const isVeg = item.category === 'Veg';
  const isPopular = item.rating >= 4.3;

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 0.68, 0, 1.2] }}
      className="card-base flex flex-col group overflow-hidden"
    >
      {/* IMAGE */}
      <div 
        className="relative h-48 overflow-hidden rounded-t-[1.5rem] cursor-pointer"
        onClick={() => setShow(true)}
      >
        <img
          src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/400`}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges row */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={isVeg ? 'badge-veg' : 'badge-nonveg'}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
              {isVeg ? 'Veg' : 'Non-Veg'}
            </span>
          </span>
          {isPopular && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider"
              style={{ background: 'rgba(249,115,22,0.2)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }}>
              <Flame size={9} /> Hot
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Star size={11} className="text-yellow-400 fill-yellow-400" />
          <span className="text-white text-[11px] font-black">{item.rating}</span>
        </div>

        {/* Price on image */}
        <div className="absolute bottom-3 right-3">
          <span className="text-white font-black text-xl tracking-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            ₹{item.price}
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          <h3
            className="font-black text-base leading-tight tracking-tight group-hover:text-orange-500 transition-colors line-clamp-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {item.name}
          </h3>
          <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed font-medium"
            style={{ color: 'var(--text-muted)' }}>
            {item.description}
          </p>
        </div>

        <div className="mt-auto">
          {isOutOfStock ? (
            <div className="w-full text-center py-2.5 rounded-xl text-xs font-black uppercase tracking-widest"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              Out of Stock
            </div>
          ) : (
            <button
              onClick={() => onAddToCart(item)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                color: 'white',
                boxShadow: '0 4px 16px rgba(249,115,22,0.3)'
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 24px rgba(249,115,22,0.45)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(249,115,22,0.3)')}
            >
              <Plus size={16} strokeWidth={3} />
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </motion.div>

    {/* LUXURY POPUP MODAL */}
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShow(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative"
            style={{ background: 'var(--bg-primary)', border: '1px solid rgba(255,215,0,0.3)' }}
          >
            <button 
              onClick={() => setShow(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors backdrop-blur-md"
            >
              <X size={18} />
            </button>
            <div className="h-64 relative">
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-center">
                 <h2 className="text-2xl font-black tracking-tight mb-1" style={{ color: '#ffd700', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                   {item.name}
                 </h2>
                 <p className="font-bold text-lg text-white">₹{item.price}</p>
              </div>
            </div>
            <div className="p-8 text-center" style={{ background: 'var(--bg-elevated)' }}>
              <p className="leading-relaxed mb-8" style={{ color: 'var(--text-muted)' }}>
                {item.description}
              </p>
              
              <button
                onClick={() => {
                  onAddToCart(item);
                  setShow(false);
                }}
                disabled={isOutOfStock}
                className="w-full py-4 rounded-xl font-black text-lg text-white uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                style={{ 
                  background: 'linear-gradient(135deg, #ffd700, #b8860b)',
                  boxShadow: '0 10px 30px rgba(218,165,32,0.3)',
                  color: '#000'
                }}
              >
                {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
