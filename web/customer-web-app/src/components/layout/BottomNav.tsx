import { useState } from 'react';
import { Home, Car, Package, Settings } from 'lucide-react';

const NavItem = ({ 
  icon: Icon, 
  label, 
  active = false,
  onClick 
}: { 
  icon: any, 
  label: string, 
  active?: boolean,
  onClick?: () => void 
}) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 w-16 transition-colors active:scale-90 duration-200 ${
      active 
        ? 'text-yellow-600 dark:text-yellow-500' 
        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
    }`}
  >
    <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-yellow-500/10' : ''}`}>
      <Icon className={`w-6 h-6 ${active ? 'fill-yellow-500/20 stroke-[2.5px]' : 'stroke-2'}`} />
    </div>
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

export default function BottomNav() {
  const [activeTab, setActiveTab] = useState('Store');

  const navItems = [
    { icon: Home, label: 'Store' },
    { icon: Car, label: 'Ride' },
    { icon: Package, label: 'Deliver' },
    { icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Content area */}
      <div className="p-6 pb-24">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {activeTab}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Currently viewing: <span className="font-semibold text-yellow-600 dark:text-yellow-500">{activeTab}</span>
        </p>
      </div>

      {/* Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-white/5 py-2 px-6 z-50">
        <div className="flex justify-between items-end max-w-md mx-auto">
          {navItems.map((item) => (
            <NavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.label}
              onClick={() => setActiveTab(item.label)}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}