import React, { useEffect } from 'react';
import { collection, onSnapshot, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { Package } from 'lucide-react';

interface NotificationListenerProps {
  userRole: string;
}

export default function NotificationListener({ userRole }: NotificationListenerProps) {
  useEffect(() => {
    if (userRole !== 'admin' && userRole !== 'manager') return;

    // Listen for new orders
    const q = query(
      collection(db, 'orders'),
      where('status', '==', 'Pending'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    let isInitialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const order = change.doc.data();
          toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#111827] shadow-2xl rounded-[2rem] pointer-events-auto flex ring-1 ring-white/10 border border-slate-800`}>
              <div className="flex-1 w-0 p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                      <Package size={24} />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-black text-white uppercase tracking-widest">New Order Received! 🍛</p>
                    <p className="mt-1 text-sm text-slate-400 font-medium truncate">
                      An order for ₹{order.totalAmount} just arrived.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-slate-800">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-3xl p-4 flex items-center justify-center text-sm font-bold text-orange-500 hover:text-orange-400 focus:outline-none"
                >
                  Close
                </button>
              </div>
            </div>
          ), { duration: 5000 });
          
          // Play a subtle notification sound if possible
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play();
          } catch (e) {
            console.log("Audio play blocked");
          }
        }
      });
    });

    return () => unsubscribe();
  }, [userRole]);

  return null;
}
