import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, Navigation, Package as PackagePin, Bike, CheckCircle, MapPin } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  status: string;
}

const containerStyle = {
  width: '100%',
  height: '400px'
};

const center = {
  lat: 13.0827,
  lng: 80.2707 // Chennai default
};

const darkMapStyles = [
  { "elementType": "geometry", "stylers": [{ "color": "#111827" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#111827" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#4b5563" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca3af" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d1d5db" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#1f2937" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1f2937" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#111827" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b7280" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0b1120" }] }
];

export default function TrackingModal({ isOpen, onClose, orderId, status: initialStatus }: TrackingModalProps) {
  const [orderData, setOrderData] = React.useState<any>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const unsub = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (snap.exists()) {
        setOrderData(snap.data());
      }
    });
    return () => unsub();
  }, [isOpen, orderId]);

  const currentStatus = orderData?.status || initialStatus;

  // Map status to progress (0 to 100)
  const getProgress = () => {
    switch (currentStatus) {
      case 'Placed': return '12%';
      case 'Preparing': return '37%';
      case 'Ready': return '62%';
      case 'Out for Delivery': return '87%';
      case 'Delivered': return '100%';
      default: return '12%'; // Assume Placed
    }
  };

  const steps = [
    { label: 'Placed', icon: PackagePin },
    { label: 'Preparing', icon: CheckCircle }, // Replaced with general icons
    { label: 'Ready', icon: Navigation },
    { label: 'Delivered', icon: Truck }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 perspective-1000">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 100, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: 100, rotateX: 10 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            className="relative bg-[#111827] w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[80vh] sm:h-[600px]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0b1120] z-20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/20">
                  <Navigation size={24} />
                </div>
                <div>
                  <h3 className="font-black text-white text-lg tracking-tight">Order #{orderId.slice(-8)}</h3>
                  <p className="text-xs text-orange-500 font-bold uppercase tracking-widest mt-0.5">Live Live Live</p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Simulated Uber Map Area */}
            <div className="relative flex-1 bg-slate-900 overflow-hidden">
               {/* City Map Background Pattern */}
               <div className="absolute inset-0 opacity-10" style={{ 
                 backgroundImage: 'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000")',
                 backgroundSize: 'cover',
                 backgroundPosition: 'center',
                 filter: 'grayscale(100%) blur(2px)'
               }}/>
               
               {/* Delivery Path UI (Uber Style) */}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg className="w-full h-full max-w-[300px]" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path 
                      d="M 20,80 Q 40,70 50,50 T 80,20" 
                      fill="transparent" 
                      stroke="#1e293b" 
                      strokeWidth="2" 
                      strokeDasharray="4 4"
                    />
                  </svg>
                  {/* Moving Bike on Map if Out for delivery */}
                  {currentStatus === 'Out for Delivery' && (
                    <motion.div 
                      key="bike-moving"
                      initial={{ x: -100, y: 100, opacity: 0 }}
                      animate={{ x: 50, y: -50, opacity: 1 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="absolute z-10 p-3 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)] flex items-center justify-center text-slate-900"
                    >
                      <Bike size={24} className="transform -scale-x-100 rotate-12" />
                    </motion.div>
                  )}
                  {/* Restaurant Pin */}
                  <div className="absolute bottom-[20%] left-[20%] w-6 h-6 bg-orange-500 rounded-full border-4 border-white shadow-xl shadow-orange-500/30 font-bold flex items-center justify-center text-white text-[10px]">R</div>
                  {/* Home Pin */}
                  <div className="absolute top-[20%] right-[20%] w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-xl shadow-blue-500/30 flex items-center justify-center text-white"><MapPin size={10} /></div>
               </div>

               {/* Live Status Overlay Floating */}
               <motion.div 
                 className="absolute top-6 inset-x-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-4 z-20"
                 initial={{ y: -20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
               >
                 <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-30 rounded-full animate-pulse" />
                    <div className="relative w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                      <Truck size={24} />
                    </div>
                 </div>
                 <div>
                    <h4 className="text-xl font-black text-white">{currentStatus}</h4>
                    <p className="text-emerald-400 text-sm font-bold tracking-tight">
                      {currentStatus === 'Out for Delivery' ? 'ETA: 20 mins 🚀' : 
                       currentStatus === 'Preparing' ? 'Chef is cooking your meal 👨‍🍳' :
                       currentStatus === 'Delivered' ? 'Delivered successfully ✅' : 'Waiting for kitchen...'}
                    </p>
                 </div>
               </motion.div>
            </div>

            {/* Bottom 4-Step Progress UI */}
            <div className="bg-[#1e293b] p-8 border-t border-slate-800 relative z-30">
              <h3 className="text-white font-bold text-lg mb-6">Order Status</h3>
              <div className="relative w-full max-w-md mx-auto h-16">
                {/* Track Line */}
                <div className="absolute top-4 left-[12%] right-[12%] h-1 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: getProgress() }}
                    transition={{ duration: 1, ease: 'easeInOut' }}
                    className="h-full bg-orange-500 shadow-[0_0_10px_rgba(255,107,0,0.8)]"
                  />
                </div>
                
                {/* 4 Steps */}
                <div className="absolute top-0 inset-x-0 flex justify-between">
                  {steps.map((step, i) => {
                    const stepProgress = [12, 37, 62, 87, 100];
                     // A basic logic to determine if step is completed or active
                    const isCompleted = ['Placed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered'].indexOf(currentStatus || 'Placed') >= i;
                    const isActive = ['Placed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered'].indexOf(currentStatus || 'Placed') === i;

                    return (
                      <div key={i} className="flex flex-col items-center gap-2 relative group w-1/4">
                        <motion.div 
                          animate={{ 
                            scale: isActive ? [1, 1.2, 1] : 1,
                          }}
                          transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
                          className={`w-9 h-9 rounded-full flex items-center justify-center border-4 transition-all duration-500 cursor-default ${
                            isCompleted ? 'bg-orange-500 border-orange-200 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'
                          }`}
                        >
                           {isCompleted && !isActive ? <CheckCircle size={14} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                        </motion.div>
                        <span className={`text-[10px] font-black uppercase tracking-widest text-center absolute top-12 transition-colors ${isActive ? 'text-white' : isCompleted ? 'text-orange-200' : 'text-slate-600'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
