import { MapPin, Trash2, CheckCircle } from 'lucide-react';

interface AddressProps {
  id: string;
  tag: string; 
  street: string;
  isDefault: boolean;
  onDelete: (id: string) => void;
}

export const AddressCard = ({ id, tag, street, isDefault, onDelete }: AddressProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDefault ? 'bg-yellow-500 text-black' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{tag}</h4>
            {isDefault && (
              <span className="text-[10px] font-bold bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 px-1.5 py-0.5 rounded">Default</span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{street}</p>
        </div>
      </div>
      <button 
        onClick={() => onDelete(id)}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};