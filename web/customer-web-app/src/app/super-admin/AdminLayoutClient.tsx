'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, ShoppingCart, Car, Truck, 
  CreditCard, AlertTriangle, FileText, Settings, LogOut, 
  Menu, Bell, ChevronDown, ChevronRight, 
  User, Banknote, ShieldCheck 
} from 'lucide-react';
import { signOut } from "next-auth/react"; // ✅ Import NextAuth signOut

// Define the structure for permissions
type AdminRole = 'SUPER_ADMIN' | 'ADMIN_MANAGER' | 'ADMIN_SUPPORT' | 'ADMIN_FINANCE';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  userRole: string; // Passed from server layout
}

export default function AdminLayoutClient({ children, userRole }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const role = userRole as AdminRole;

  // --- PERMISSION LOGIC ---
  const hasAccess = (allowedRoles: AdminRole[]) => allowedRoles.includes(role);

  // Define Menu Items with Permissions
  const menuItems = [
    { 
      name: 'Orders', 
      icon: ShoppingCart, 
      href: '/super-admin/orders',
      allowed: ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT'] 
    },
    { 
      name: 'Rides', 
      icon: Car, 
      href: '/super-admin/rides',
      allowed: ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT']
    },
    { 
      name: 'Deliveries', 
      icon: Truck, 
      href: '/super-admin/deliveries',
      allowed: ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT']
    },
    { 
      name: 'Transactions', 
      icon: CreditCard, 
      href: '/super-admin/transactions',
      allowed: ['SUPER_ADMIN', 'ADMIN_FINANCE']
    },
    // 👇 NEW: Payouts Link
    { 
      name: 'Payouts', 
      icon: Banknote, 
      href: '/super-admin/payouts',
      allowed: ['SUPER_ADMIN', 'ADMIN_FINANCE']
    },
    // 👇 NEW: Verification Link
    { 
      name: 'Verification', 
      icon: ShieldCheck, 
      href: '/super-admin/verification',
      allowed: ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT']
    },
    { 
      name: 'Disputes', 
      icon: AlertTriangle, 
      href: '/super-admin/disputes',
      allowed: ['SUPER_ADMIN', 'ADMIN_SUPPORT']
    },
    { 
      name: 'Reports', 
      icon: FileText, 
      href: '/super-admin/reports',
      allowed: ['SUPER_ADMIN', 'ADMIN_FINANCE', 'ADMIN_MANAGER']
    },
    { 
      name: 'Settings', 
      icon: Settings, 
      href: '/super-admin/settings',
      allowed: ['SUPER_ADMIN']
    },
  ];

  // User Management Permission (Grouped)
  const canViewUsers = hasAccess(['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT']);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut({ callbackUrl: '/sign-in' }); // ✅ Use NextAuth signOut
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const isChildActive = (basePath: string) => pathname.startsWith(basePath);

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex font-sans">
      
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#1E293B] border-r border-gray-800 transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-black font-black">
            {role === 'SUPER_ADMIN' ? 'SA' : role === 'ADMIN_FINANCE' ? 'FN' : role === 'ADMIN_SUPPORT' ? 'SP' : 'MG'}
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight">Admin Panel</span>
            <span className="text-[10px] uppercase text-gray-500 tracking-wider font-bold">{role.replace('_', ' ')}</span>
          </div>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-hide">
          {/* Dashboard - Accessible to All Admins */}
          <Link 
            href="/super-admin/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 ${
              isActive('/super-admin/dashboard') 
                ? 'bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>

          {/* User Management Section */}
          {canViewUsers && (
            <div className="mb-1">
              <button 
                onClick={() => setIsUsersOpen(!isUsersOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                   isChildActive('/super-admin/users') ? 'text-white bg-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5" />
                    <span className={isChildActive('/super-admin/users') ? 'font-bold' : ''}>Users</span>
                  </div>
                  {isUsersOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {isUsersOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-3">
                   <Link href="/super-admin/users/vendors" className={`block px-4 py-2 text-sm rounded-lg transition-colors ${isActive('/super-admin/users/vendors') ? 'text-yellow-500 font-bold bg-yellow-500/10' : 'text-gray-400 hover:text-white'}`}>
                     Vendors
                   </Link>
                   <Link href="/super-admin/users/riders" className={`block px-4 py-2 text-sm rounded-lg transition-colors ${isActive('/super-admin/users/riders') ? 'text-yellow-500 font-bold bg-yellow-500/10' : 'text-gray-400 hover:text-white'}`}>
                     Riders
                   </Link>
                   <Link href="/super-admin/users/customers" className={`block px-4 py-2 text-sm rounded-lg transition-colors ${isActive('/super-admin/users/customers') ? 'text-yellow-500 font-bold bg-yellow-500/10' : 'text-gray-400 hover:text-white'}`}>
                     Customers
                   </Link>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Menu Items based on Role */}
          {menuItems.map((item) => {
             if (!hasAccess(item.allowed as AdminRole[])) return null;

             return (
               <Link 
                 key={item.name} 
                 href={item.href}
                 className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 ${
                   isActive(item.href) 
                     ? 'bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20' 
                     : 'text-gray-400 hover:bg-white/5 hover:text-white'
                 }`}
               >
                 <item.icon className="w-5 h-5" />
                 {item.name}
               </Link>
             );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-800 bg-[#1E293B]">
           <button 
             onClick={handleLogout}
             disabled={isLoggingOut}
             className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl transition-colors font-medium ${
               isLoggingOut 
                 ? 'text-red-300 bg-red-500/5 cursor-not-allowed' 
                 : 'text-red-400 hover:bg-red-500/10'
             }`}
           >
             <LogOut className={`w-5 h-5 ${isLoggingOut ? 'animate-spin' : ''}`} />
             {isLoggingOut ? 'Logging out...' : 'Logout'}
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 relative bg-[#0F172A] min-h-screen">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-40">
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-gray-400">
             <Menu />
           </button>

           <div className="flex-1 max-w-xl mx-4 hidden md:block">
             <input 
               type="text" 
               placeholder="Search..." 
               className="w-full bg-[#1E293B] border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-yellow-500 transition-colors"
             />
           </div>

           <div className="flex items-center gap-4">
              <Link 
                href={"/super-admin/notifications"} 
                className={`relative p-2 transition-colors ${
                  isActive('/super-admin/notifications') ? 'text-yellow-500' : 'text-gray-400 hover:text-white'
                }`}
              >
                 <Bell className="w-5 h-5" />
                 <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
              </Link>
              
              <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
                 <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">
                    <Link 
                      href={"/super-admin/profile"} 
                      className={`relative p-2 transition-colors ${
                        isActive('/super-admin/profile') ? 'text-yellow-500' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <User className="w-5 h-5" />
                    </Link>
                 </div>
              </div>
           </div>
        </header>

        <div className="p-4 md:p-8">
           {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
}