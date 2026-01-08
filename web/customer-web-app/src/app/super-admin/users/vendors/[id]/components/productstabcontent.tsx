import React, { useState, useMemo } from 'react';
import { ShoppingBag, Ban, Search, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Currency } from '@/components/Currency';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  status: 'ACTIVE' | 'BANNED' | 'OUT_OF_STOCK' | 'DISABLED';
}

interface ProductsTabProps {
  products: Product[];
  isLoading?: boolean; // ✅ Added optional prop
  onToggleBan: (id: string, status: string) => void;
}

export default function ProductsTabContent({ products, onToggleBan, isLoading = false }: ProductsTabProps) {
  const [search, setSearch] = useState("");
  
  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // --- Filter Logic ---
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!search) return products;
    const lowerSearch = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerSearch) || 
      p.category.toLowerCase().includes(lowerSearch)
    );
  }, [products, search]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div>
      {/* Header & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-blue-500" /> Catalog ({products?.length || 0})
        </h3>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={isLoading}
            className="w-full bg-[#0F172A] border border-gray-800 rounded-lg pl-10 pr-8 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors disabled:opacity-50"
          />
          {search && (
            <button 
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        // ✅ Loading Skeleton
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#0F172A] border border-gray-800 rounded-lg p-4 flex gap-4 animate-pulse">
              <div className="w-16 h-16 bg-gray-800 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
                <div className="h-6 bg-gray-800 rounded w-20 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : currentProducts.length > 0 ? (
        <>
          {/* ✅ Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[300px] content-start">
            {currentProducts.map(product => (
              <div key={product.id} className={`bg-[#0F172A] border rounded-lg p-4 flex gap-4 transition-all hover:border-gray-600 ${product.status === 'DISABLED' ? 'border-red-500/30 opacity-75' : 'border-gray-800'}`}>
                
                {/* Image */}
                <div className="w-16 h-16 bg-gray-800 rounded-lg flex-shrink-0 bg-cover bg-center border border-gray-700" style={{ backgroundImage: `url(${product.image})` }} />
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-white truncate pr-2 text-sm">{product.name}</h4>
                    {product.status === 'DISABLED' && <Ban className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5"><Currency amount={product.price}/> • {product.category}</p>
                  
                  <div className="mt-3">
                    <button 
                      onClick={() => onToggleBan(product.id, product.status)}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors uppercase tracking-wide ${
                        product.status === 'DISABLED' 
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white border border-green-500/20' 
                          : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20'
                      }`}
                    >
                      {product.status === 'DISABLED' ? 'Unban Item' : 'Ban Item'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ✅ Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-800">
               <span className="text-xs text-gray-500">
                 Page {currentPage} of {totalPages}
               </span>
               <div className="flex gap-2">
                 <button 
                   onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                   disabled={currentPage === 1}
                   className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 >
                   <ChevronLeft className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                   disabled={currentPage === totalPages}
                   className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                 >
                   <ChevronRight className="w-4 h-4" />
                 </button>
               </div>
            </div>
          )}
        </>
      ) : (
        // Empty State
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-800 rounded-xl bg-[#0F172A]/50">
          <ShoppingBag className="w-12 h-12 text-gray-700 mb-3" />
          <p className="text-gray-400 font-bold">No products found</p>
          <p className="text-gray-600 text-sm mt-1">
            {search ? `No results matching "${search}"` : "This vendor hasn't added any products yet."}
          </p>
          {search && (
            <button onClick={() => setSearch("")} className="mt-4 text-xs text-blue-400 hover:text-blue-300 underline">
              Clear Search
            </button>
          )}
        </div>
      )}
    </div>
  );
}