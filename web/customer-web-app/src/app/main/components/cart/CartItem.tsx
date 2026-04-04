import Image from "next/image";
import { Plus, Minus, Trash2 } from "lucide-react";

interface CartItemProps {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string;
  onUpdateQuantity: (id: number, type: "inc" | "dec") => void;
  onRemove: (id: number) => void;
}

export const CartItem = ({
  id,
  name,
  description,
  price,
  quantity,
  image,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) => {
  return (
    <div className="flex gap-4 p-4 bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
      {/* Product Image */}
      <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-xl relative overflow-hidden flex-shrink-0">
        {/* Using a div as placeholder, replace with Next/Image in production */}
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800" />
        {/* <Image src={image} fill className="object-cover" alt={name} /> */}
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-sm">
              {name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
              {description}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm">₦{price.toFixed(2)}</span>
            <button
              onClick={() => onRemove(id)}
              className="text-red-500 bg-red-50 dark:bg-red-900/20 p-1.5 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quantity Control */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-lg p-1 border border-gray-100 dark:border-white/5">
            <button
              onClick={() => onUpdateQuantity(id, "dec")}
              className="w-7 h-7 flex items-center justify-center bg-white dark:bg-white/10 rounded-md shadow-sm hover:scale-95 transition-transform"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-bold w-4 text-center">
              {quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(id, "inc")}
              className="w-7 h-7 flex items-center justify-center bg-white dark:bg-white/10 rounded-md shadow-sm hover:scale-95 transition-transform"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
