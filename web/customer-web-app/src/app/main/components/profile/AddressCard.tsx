import { Check, MapPin, Trash2 } from "lucide-react";

interface AddressProps {
  id: string;
  label: string;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export const AddressCard = ({
  id,
  label,
  street,
  city,
  state,
  latitude,
  longitude,
  isDefault,
  onDelete,
  onSetDefault,
}: AddressProps) => {
  return (
    <article className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm transition hover:border-yellow-400/50 dark:border-white/[0.07] dark:bg-[#151515]">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDefault ? "bg-yellow-400 text-black" : "bg-gray-100 text-gray-500 dark:bg-white/10"}`}
        >
          <MapPin className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h4 className="truncate text-sm font-bold text-gray-900 dark:text-white">
              {label[0] + label.slice(1).toLowerCase()}
            </h4>
            {isDefault && (
              <span className="text-[10px] font-bold bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 px-1.5 py-0.5 rounded">
                Default
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-gray-500 dark:text-gray-400">
            {[street, city, state].filter(Boolean).join(", ") || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!isDefault && <button onClick={() => onSetDefault(id)} className="rounded-xl p-2.5 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10" aria-label={`Set ${label} as default`} title="Set as default"><Check className="h-4 w-4" /></button>}
        <button onClick={() => onDelete(id)} className="rounded-xl p-2.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20" aria-label={`Delete ${label} address`}><Trash2 className="w-4 h-4" /></button>
      </div>
    </article>
  );
};
