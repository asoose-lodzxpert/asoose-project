export function KPICardSkeleton() {
  return (
    <div className="bg-[#1E293B] p-5 rounded-xl border border-gray-800 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="h-3 bg-gray-700 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-700 rounded w-16"></div>
        </div>
        <div className="w-9 h-9 bg-gray-700 rounded-lg"></div>
      </div>
      <div className="w-full bg-gray-700 h-1 mt-4 rounded-full"></div>
    </div>
  );
}

// Skeleton for Table Rows (Desktop)
export function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-800">
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded w-32 animate-pulse"></div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <div className="h-3 bg-gray-700 rounded w-36 animate-pulse"></div>
          <div className="h-3 bg-gray-700 rounded w-36 animate-pulse"></div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded w-20 animate-pulse"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-6 bg-gray-700 rounded w-24 animate-pulse"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div>
      </td>
      <td className="px-6 py-4 text-center">
        <div className="h-8 w-8 bg-gray-700 rounded-lg animate-pulse mx-auto"></div>
      </td>
    </tr>
  );
}

// Skeleton for Mobile Cards
export function DeliveryCardSkeleton() {
  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded w-20"></div>
        </div>
        <div className="h-6 bg-gray-700 rounded w-24"></div>
      </div>

      {/* Type */}
      <div className="mb-3">
        <div className="h-3 bg-gray-700 rounded w-24"></div>
      </div>

      {/* Route Box */}
      <div className="mb-3 bg-[#0F172A] p-3 rounded-lg border border-gray-800 space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-3.5 h-3.5 bg-gray-700 rounded mt-0.5"></div>
          <div className="flex-1 space-y-1">
            <div className="h-2 bg-gray-700 rounded w-12"></div>
            <div className="h-3 bg-gray-700 rounded w-32"></div>
          </div>
        </div>
        <div className="border-l-2 border-dashed border-gray-700 ml-1.5 h-2"></div>
        <div className="flex items-start gap-2">
          <div className="w-3.5 h-3.5 bg-gray-700 rounded mt-0.5"></div>
          <div className="flex-1 space-y-1">
            <div className="h-2 bg-gray-700 rounded w-12"></div>
            <div className="h-3 bg-gray-700 rounded w-32"></div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between gap-2">
            <div className="h-3 bg-gray-700 rounded w-16"></div>
            <div className="h-3 bg-gray-700 rounded w-24"></div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-800">
        <div className="flex-1 h-9 bg-gray-700 rounded-lg"></div>
        <div className="w-12 h-9 bg-gray-700 rounded-lg"></div>
      </div>
    </div>
  );
}

// Full Page Skeleton
export function DeliveriesPageSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-[#0F172A] overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-6">
          
          {/* Header Skeleton */}
          <div className="flex justify-between items-center">
            <div>
              <div className="h-8 bg-gray-700 rounded w-64 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-96 animate-pulse"></div>
            </div>
            <div className="h-10 bg-gray-700 rounded w-40 animate-pulse"></div>
          </div>

          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <KPICardSkeleton key={i} />
            ))}
          </div>

          {/* Table Container Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
            {/* Filter Header Skeleton */}
            <div className="p-4 border-b border-gray-800 flex flex-col md:flex-row gap-4 justify-between">
              <div className="h-10 bg-gray-700 rounded-lg w-full md:w-96 animate-pulse"></div>
              <div className="flex gap-2">
                <div className="h-10 bg-gray-700 rounded-lg w-24 animate-pulse"></div>
                <div className="h-10 bg-gray-700 rounded-lg w-28 animate-pulse"></div>
              </div>
            </div>

            {/* Desktop Table Skeleton - Hidden on mobile */}
            <div className="hidden md:block overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#0F172A] border-b border-gray-800">
                  <tr>
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <th key={i} className="px-6 py-4">
                        <div className="h-3 bg-gray-700 rounded w-20 animate-pulse"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Skeleton */}
            <div className="md:hidden p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <DeliveryCardSkeleton key={i} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}