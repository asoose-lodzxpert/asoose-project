import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  RowSelectionState,
} from "@tanstack/react-table";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (updater: any) => void;
  pageSize?: number;
  renderMobileCard?: (item: T) => React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  rowSelection,
  onRowSelectionChange,
  pageSize = 10,
  renderMobileCard,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    enableRowSelection: !!onRowSelectionChange,
    onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
    },
  });

  const currentPageData = table.getRowModel().rows.map(row => row.original);

  return (
    <div className="h-full flex flex-col">
      {/* Desktop Table View - hidden on mobile */}
      <div className="hidden md:flex flex-col h-full bg-[#0F172A] border border-gray-800 rounded-lg overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700 text-xs uppercase text-gray-500 sticky top-0 bg-[#0F172A] z-10">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left cursor-pointer"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="truncate">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-gray-800">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-[#1E293B] transition-colors">
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
          <span className="text-gray-400">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-700 transition-colors"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ◀
            </button>
            <button
              className="px-3 py-1 bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-700 transition-colors"
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
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {renderMobileCard ? (
            currentPageData.map((item, index) => (
              <div key={index}>{renderMobileCard(item)}</div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              No mobile card renderer provided
            </div>
          )}
        </div>

        {/* Mobile Pagination */}
        <div className="border-t border-gray-800 px-4 py-3 text-sm flex justify-between items-center bg-[#0F172A] flex-shrink-0">
          <span className="text-gray-400 text-xs">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-700 transition-colors text-xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ◀ Prev
            </button>
            <button
              className="px-3 py-1.5 bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-700 transition-colors text-xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}