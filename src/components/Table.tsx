import React from 'react';

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
  return (
    <div className="w-full overflow-x-auto bg-slate-800 rounded-xl shadow-lg border border-slate-700">
      <table className="w-full text-left text-slate-300">
        <thead className="bg-slate-900 border-b border-slate-700">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={String(col.key) + idx}
                className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500">
                No data available
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr key={keyExtractor(item) || rowIdx} className="hover:bg-slate-700/50 transition-all">
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
