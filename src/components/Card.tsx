import React from 'react';
import { useAdminTheme } from '../admin/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}

export default function Card({ children, className = '', title, icon }: CardProps) {
  const isDark = useAdminTheme();
  return (
    <div
      className={`rounded-2xl shadow-lg p-6 transition-colors duration-300 ${className}`}
      style={{
        background: isDark ? '#1e293b' : '#ffffff',
        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        color: isDark ? '#e2e8f0' : '#0f172a',
      }}
    >
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-6">
          {icon && <div className="text-orange-500">{icon}</div>}
          {title && (
            <h3
              className="font-bold text-lg"
              style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
            >
              {title}
            </h3>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
