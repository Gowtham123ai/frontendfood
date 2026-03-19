import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}

export default function Card({ children, className = '', title, icon }: CardProps) {
  return (
    <div className={`bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-6 text-slate-200 ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-6">
          {icon && <div className="text-orange-500">{icon}</div>}
          {title && <h3 className="font-bold text-lg text-white">{title}</h3>}
        </div>
      )}
      {children}
    </div>
  );
}
