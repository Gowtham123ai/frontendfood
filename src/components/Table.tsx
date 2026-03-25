import React from 'react';
import { useAdminTheme } from '../admin/ThemeContext';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
}

export default function Table<T>({ data, columns, keyExtractor }: TableProps<T>) {
  const isDark = useAdminTheme();

  return (
    <div
      className="w-full overflow-x-auto rounded-2xl shadow-lg border transition-colors duration-300"
      style={{ background: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }}
    >
      <table className="w-full text-left" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
        <thead style={{ background: isDark ? '#0f172a' : '#f8fafc', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={String(col.key) + idx}
                className="px-6 py-4 text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ color: isDark ? '#64748b' : '#94a3b8' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ borderColor: isDark ? '#334155' : '#f1f5f9' }} className="divide-y">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                No data available
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr
                key={keyExtractor(item) || String(rowIdx)}
                className="transition-all"
                style={{ borderColor: isDark ? '#334155' : '#f1f5f9' }}
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#fafaf8')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {columns.map((col, colIdx) => (
                  <td key={String(col.key) + colIdx} className="px-6 py-4 whitespace-nowrap">
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
