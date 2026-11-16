import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export default function DataTable({
  columns,
  data = [],
  keyField = 'id',
  onRowClick,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  emptyMessage = 'No inspection records found',
  isLoading = false
}) {
  return (
    <div className="w-full bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.03)] overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7] dark:bg-[#141D17] text-xs font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A3B3A6]">
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`py-3.5 px-4 ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5EDE6]/60 dark:divide-[#29382D]/60">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="py-4 px-4">
                      <div className="h-4 bg-[#E5EDE6] dark:bg-[#29382D] rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-[#647067] dark:text-[#A3B3A6]">
                    <Inbox className="w-8 h-8 mb-2 stroke-[1.5] text-[#15803D] dark:text-[#4ADE80]" />
                    <p className="text-sm font-medium text-[#17211B] dark:text-[#F0FDF4]">{emptyMessage}</p>
                    <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-0.5">Try adjusting your filters or search terms</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row[keyField] || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`group transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]/40' : ''
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`py-3.5 px-4 text-[#17211B] dark:text-[#F0FDF4] ${col.className || ''}`}
                    >
                      {col.render ? col.render(row, rowIdx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3.5 border-t border-[#E5EDE6] dark:border-[#29382D] flex items-center justify-between text-xs text-[#647067] dark:text-[#A3B3A6] bg-[#F7FAF7]/60 dark:bg-[#141D17]/60">
          <div>
            Showing <span className="font-semibold text-[#17211B] dark:text-[#F0FDF4]">{data.length}</span> of{' '}
            <span className="font-semibold text-[#17211B] dark:text-[#F0FDF4]">{totalItems}</span> records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-[#E5EDE6] dark:border-[#29382D] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] text-[#17211B] dark:text-[#F0FDF4] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-[#17211B] dark:text-[#F0FDF4]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-[#E5EDE6] dark:border-[#29382D] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F0FDF4] dark:hover:bg-[#173D26] text-[#17211B] dark:text-[#F0FDF4] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
