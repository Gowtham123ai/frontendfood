import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Order } from '../types';
import Card from '../components/Card';
import { useAdminTheme } from './ThemeContext';
import { Map, MapPin } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

export default function AnalyticsPage({ userRole }: { userRole: string }) {
  const isDark = useAdminTheme();
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const textMuted   = isDark ? '#94a3b8' : '#64748b';
  const cardBg      = isDark ? '#111827' : '#ffffff';
  const cardBorder  = isDark ? '#1f2937' : '#e2e8f0';
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
    return () => unsub();
  }, []);

  // Revenue Logic
  const revenueByDay: Record<string, number> = {};
  orders.forEach(order => {
    if (order.createdAt) {
      let dateObj = new Date();
      if ((order.createdAt as any).seconds) {
        dateObj = new Date((order.createdAt as any).seconds * 1000);
      } else {
        dateObj = new Date(order.createdAt as string);
      }
      const date = dateObj.toLocaleDateString();
      revenueByDay[date] = (revenueByDay[date] || 0) + (order.totalAmount || 0);
    }
  });

  const sortedDates = Object.keys(revenueByDay).sort((a,b) => new Date(a).getTime() - new Date(b).getTime()).slice(-7);

  const revenueData = {
    labels: sortedDates,
    datasets: [{
      label: 'Revenue (₹)',
      data: sortedDates.map(date => revenueByDay[date]),
      borderColor: '#ff6b00',
      backgroundColor: 'rgba(255, 107, 0, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 6,
      pointBackgroundColor: '#ff6b00',
      borderWidth: 3,
    }]
  };

  // Top Selling Items Logic
  const itemCount: Record<string, number> = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      itemCount[item.name] = (itemCount[item.name] || 0) + 1;
    });
  });
  const topItems = Object.entries(itemCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const topItemsData = {
    labels: topItems.map(i => i[0]),
    datasets: [{
      data: topItems.map(i => i[1]),
      backgroundColor: ['#ff6b00', '#22c55e', '#facc15', '#3b82f6', '#ec4899'],
      borderWidth: 0,
      hoverOffset: 15
    }]
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        display: false,
        labels: { color: '#94a3b8', font: { family: 'Poppins' } } 
      } 
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { size: 10 } } }
    }
  };

  if(!orders.length) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const totalRevenue = orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const totalOrders = orders.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-[2rem] border shadow-xl transition-colors duration-300" style={{ background: cardBg, borderColor: cardBorder }}>
           <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: textMuted }}>Total Revenue</p>
           <h3 className="text-3xl font-black" style={{ color: textPrimary }}>₹{totalRevenue.toLocaleString()}</h3>
        </div>
        <div className="p-6 rounded-[2rem] border shadow-xl transition-colors duration-300" style={{ background: cardBg, borderColor: cardBorder }}>
           <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: textMuted }}>Total Orders</p>
           <h3 className="text-3xl font-black" style={{ color: textPrimary }}>{totalOrders}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-8 rounded-[2.5rem] border shadow-2xl transition-colors duration-300" style={{ background: cardBg, borderColor: cardBorder }}>
           <h3 className="text-xl font-bold mb-6" style={{ color: textPrimary }}>Revenue Trend</h3>
           <div className="h-80">
              <Line data={revenueData} options={chartOptions} />
           </div>
        </div>

        <div className="p-8 rounded-[2.5rem] border shadow-2xl transition-colors duration-300" style={{ background: cardBg, borderColor: cardBorder }}>
           <h3 className="text-xl font-bold mb-6" style={{ color: textPrimary }}>Top Dishes</h3>
           <div className="h-64 flex items-center">
              <Doughnut 
                data={topItemsData} 
                options={{ 
                  maintainAspectRatio: false, 
                  plugins: { 
                    legend: { 
                      position: 'bottom', 
                      labels: { color: '#94a3b8', font: { size: 10 }, usePointStyle: true, padding: 20 } 
                    } 
                  } 
                }} 
              />
           </div>
        </div>
      </div>
    </div>
  );
}
