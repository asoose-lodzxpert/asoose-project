// as/customer-web-app/src/components/profile/ProfileTabs.tsx
import {
  ShoppingBag,
  Car,
  Package,
  MapPin,
  Settings,
  ShieldAlert,
} from "lucide-react";

export const TABS = [
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "rides", label: "Rides", icon: Car },
  { id: "deliveries", label: "Deliveries", icon: Package },
  { id: "disputes", label: "Disputes", icon: ShieldAlert },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export type ProfileTab = (typeof TABS)[number]["id"];

export const ProfileTabs = ({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (id: ProfileTab) => void;
}) => (
  <div className="sticky top-0 z-30 bg-gray-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm px-4 pt-4 pb-2 border-b border-gray-200 dark:border-white/5">
    <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide py-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id as ProfileTab)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all text-sm font-bold ${
            activeTab === tab.id
              ? "bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10"
              : "bg-white dark:bg-[#151515] text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
          }`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </div>
  </div>
);
