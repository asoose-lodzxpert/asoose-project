'use client';

import React, { Dispatch, SetStateAction, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  RowSelectionState,
  PaginationState,
  SortingState, // ✅ Import SortingState
  OnChangeFn,   // ✅ Import OnChangeFn
} from "@tanstack/react-table";

// 1. Updated Interface to support Pagination AND Sorting
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (updater: any) => void;
  pageSize?: number;
  renderMobileCard?: (item: T) => React.ReactNode;
  
  // Manual Pagination
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: Dispatch<SetStateAction<PaginationState>>;

  // ✅ New Sorting Props (Optional)
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
}

export function DataTable<T>({
  data,
  columns,
  rowSelection,
  onRowSelectionChange,
  pageSize = 10,
  renderMobileCard,
  pageCount,
  pagination,
  onPaginationChange,
  sorting,          // ✅ Destructure sorting
  onSortingChange,  // ✅ Destructure onSortingChange
}: DataTableProps<T>) {
  
  // 2. Logic to detect if we are in manual mode (server-side fetching)
  const isManual = pagination !== undefined && onPaginationChange !== undefined;

  // ✅ Local sorting state fallback (allows client-side sorting if props aren't passed)
  const [localSorting, setLocalSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { 
      rowSelection,
      // ✅ Use provided sorting state OR fall back to local state
      sorting: sorting ?? localSorting,
      // Use the external pagination state only if provided
      ...(isManual ? { pagination } : {}),
    },
    
    // Pagination Config
    manualPagination: isManual,
    pageCount: pageCount ?? -1, 
    
    // Selection Config
    enableRowSelection: !!onRowSelectionChange,
    onRowSelectionChange,
    onPaginationChange,
    
    // ✅ Sorting Config
    onSortingChange: onSortingChange ?? setLocalSorting,
    getSortedRowModel: getSortedRowModel(),

    // Core Config
    getCoreRowModel: getCoreRowModel(),
    // Only use local pagination logic if NOT in manual mode
    getPaginationRowModel: isManual ? undefined : getPaginationRowModel(),
    
    initialState: {
      pagination: { pageSize },
    },
  });

  const currentPageData = table.getRowModel().rows.map(row => row.original);

  return (
    <div className="h-full flex flex-col">
      {/* Desktop Table View */}
      <div className="hidden md:flex flex-col h-full bg-[#0F172A] border border-gray-800 rounded-lg overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700 text-xs uppercase text-gray-500 sticky top-0 bg-[#0F172A] z-10">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left cursor-pointer hover:text-white transition-colors select-none"
                      onClick={header.column.getToggleSortingHandler()} // ✅ Sorting Trigger
                    >
                      <div className="flex items-center gap-2 truncate">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {/* ✅ Optional: Add Sorting Indicators */}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-gray-800">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-[#1E293B] transition-colors group">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-4">
                      <div className="truncate max-w-[200px]">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
        <div className="border-t border-gray-800 px-4 py-3 text-sm flex justify-between items-center bg-[#0F172A] rounded-b-lg flex-shrink-0">
          <span className="text-gray-400 font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-gray-800 text-white rounded disabled:opacity-30 hover:bg-gray-700 transition-all active:scale-95"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ◀
            </button>
            <button
              className="px-3 py-1 bg-gray-800 text-white rounded disabled:opacity-30 hover:bg-gray-700 transition-all active:scale-95"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 scrollbar-hide">
          {renderMobileCard ? (
            currentPageData.map((item, index) => (
              <div key={index} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {renderMobileCard(item)}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-12 italic text-sm">
              No mobile card renderer provided
            </div>
          )}
        </div>

        {/* Mobile Pagination */}
        <div className="border-t border-gray-800 px-4 py-4 text-sm flex justify-between items-center bg-[#0F172A] flex-shrink-0">
          <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-gray-800 text-white rounded-xl disabled:opacity-30 hover:bg-gray-700 transition-colors text-xs font-bold"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Prev
            </button>
            <button
              className="px-4 py-2 bg-gray-800 text-white rounded-xl disabled:opacity-30 hover:bg-gray-700 transition-colors text-xs font-bold"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}