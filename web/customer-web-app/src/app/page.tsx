'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowRight, Moon, Sun, Truck, Store, 
  Menu, X, Users, Package, ChevronRight, 
  ShoppingCart, Zap, Navigation
} from 'lucide-react';

// --- DATA ---
const ECOSYSTEM_TABS = [
  { id: 'customer', label: 'For You', icon: Users },
  { id: 'vendor', label: 'For Vendors', icon: Store },
  { id: 'rider', label: 'For Riders', icon: Truck },
];

const ECOSYSTEM_CONTENT = {
  customer: {
    title: "Your daily OS.",
    desc: "Breakfast, commute, and errands. Manage it all from a single, unified interface.",
    features: ["Zero delivery fees", "Real-time tracking", "Secure wallet"],
    cta: "Get the App",
    image: "/hr.png"
  },
  vendor: {
    title: "Scale your reach.",
    desc: "Get access to thousands of new customers. We handle the logistics; you focus on the quality.",
    features: ["Next-day payouts", "Analytics dashboard", "Dedicated support"],
    cta: "Register Store",
    image: "/store.png"
  },
  rider: {
    title: "Be the boss.",
    desc: "Turn your bike or car into a money-making machine on your own schedule.",
    features: ["Instant cashout", "Flexible hours", "Insurance included"],
    cta: "Become a Rider",
    image: "/cr.png"
  }
};

const HERO_ACTIONS = {
  shop: {
    title: "Food & Mart",
    subtitle: "Restock your fridge or get a hot meal.",
    buttonText: "Order Now",
    color: "bg-yellow-500",
    textColor: "text-black",
    icon: ShoppingCart,
    link: "/store" 
  },
  ride: {
    title: "Ride Hailing",
    subtitle: "Bikes and cars available in 3 mins.",
    buttonText: "Book Ride",
    color: "bg-black",
    textColor: "text-white",
    icon: Navigation,
    link: "/ride" 
  },
  delivery: {
    title: "Logistics",
    subtitle: "Send parcels anywhere in the city.",
    buttonText: "Send Package",
    color: "bg-green-600",
    textColor: "text-white",
    icon: Package,
    link: "/logistics" 
  }
};

export default function LandingPage() {
  // --- THEME LOGIC ---
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('customer');
  const [heroTab, setHeroTab] = useState<'shop' | 'ride' | 'delivery'>('shop');

  // Prevent Hydration Mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const darkMode = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(darkMode ? 'light' : 'dark');
  };

  const currentTabContent = ECOSYSTEM_CONTENT[activeTab as keyof typeof ECOSYSTEM_CONTENT];
  const currentHeroAction = HERO_ACTIONS[heroTab];

  return (
    <div className={`min-h-screen font-sans selection:bg-yellow-500/30 transition-colors duration-300 overflow-x-hidden ${
      darkMode ? 'bg-[#0a0a0a] text-gray-100' : 'bg-[#F2F4F7] text-gray-900'
    }`}>
      
      {/* TECHNICAL BACKGROUND GRID */}
      <div className={`fixed inset-0 pointer-events-none z-0 opacity-[0.03] ${darkMode ? 'invert' : ''}`} 
           style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .hide-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* --- NAVBAR --- */}
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-colors ${
          darkMode ? 'bg-[#0a0a0a]/80 border-white/10' : 'bg-white/80 border-black/5'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-black border border-yellow-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-none">A</div>
            <span className="text-xl font-bold tracking-tight">Asoose</span>
          </div>

          <div className="hidden md:flex gap-8 text-sm font-medium items-center">
            <a href="#features" className="hover:text-yellow-500 transition-colors">Features</a>
            <a href="#ecosystem" className="hover:text-yellow-500 transition-colors">Ecosystem</a>
            <a href="#" className="hover:text-yellow-500 transition-colors">Safety</a>
            
            <Link href="/vendor/register" className="hover:text-yellow-500 transition-colors">
              Vendor Register
            </Link>
            <Link href="/rider/register" className="hover:text-yellow-500 transition-colors">
              Rider Register
            </Link>
            <Link href="/sign-up" className="hover:text-yellow-500 transition-colors">
              Sign Up
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className="hidden sm:flex bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-lg text-sm font-bold hover:translate-y-[-1px] transition-transform shadow-lg">
              Get App
            </button>
            <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className={`md:hidden absolute top-16 left-0 right-0 border-t backdrop-blur-md ${
            darkMode ? 'bg-[#0a0a0a]/95 border-white/10' : 'bg-white/95 border-black/5'
          }`}>
            <div className="flex flex-col py-4 px-6 space-y-4">
              <a href="#features" className="py-2 hover:text-yellow-500 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                Features
              </a>
              <a href="#ecosystem" className="py-2 hover:text-yellow-500 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                Ecosystem
              </a>
              <a href="#" className="py-2 hover:text-yellow-500 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                Safety
              </a>
              
              <Link href="/vendor/register" className="py-2 hover:text-yellow-500 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                Vendor Register
              </Link>
              <Link href="/rider/register" className="py-2 hover:text-yellow-500 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                Rider Register
              </Link>
              <Link href="/sign-up" className="py-2 hover:text-yellow-500 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                Sign Up
              </Link>
              
              <button className="mt-4 bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-lg text-sm font-bold hover:translate-y-[-1px] transition-transform shadow-lg">
                Get App
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION (PHONE SIMULATOR) --- */}
      <header className="relative pt-32 pb-20 px-4 sm:px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center z-10">
        
        {/* Left: Text Content */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
            darkMode ? 'bg-white/5 border-white/10 text-yellow-400' : 'bg-white border-black/5 text-yellow-600'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
            </span>
            Live across Nigeria
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[0.95]">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Super App</span><br/>
            for your daily moves.
          </h1>
          
          <p className={`text-lg sm:text-xl max-w-xl leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Ride, eat, and send. One platform connecting you to the city's pulse. 
            Instant logistics and seamless payments built in.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
             <button className="h-12 px-8 rounded-xl bg-yellow-500 text-black font-bold text-lg hover:bg-yellow-400 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-none">
              Download Now
             </button>
             <button className={`h-12 px-8 rounded-xl font-bold text-lg border-2 transition-colors ${darkMode ? 'border-white/20 hover:bg-white/10' : 'border-black/10 hover:bg-black/5'}`}>
              Partner with us
             </button>
          </div>

          <div className="flex items-center gap-4 pt-4">
             <div className="flex -space-x-3">
               {[1,2,3,4].map(i => (
                 <div key={i} className={`w-10 h-10 rounded-full border-2 ${darkMode ? 'bg-gray-800 border-black' : 'bg-gray-200 border-white'}`}></div>
               ))}
             </div>
             <div className="text-sm font-bold opacity-70">Trusted by 2M+ users</div>
          </div>
        </div>

        {/* Right: The "Phone" Interactive Simulator */}
        <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
          <div className="absolute inset-0 bg-yellow-500/20 blur-[100px] rounded-full z-0 pointer-events-none"></div>

          <div className={`relative z-10 w-[320px] sm:w-[350px] bg-white rounded-[2.5rem] p-4 shadow-2xl border-4 border-gray-900/10 transition-colors duration-500 ${
            darkMode ? 'bg-[#151515] border-white/10' : 'bg-white'
          }`}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>

            <div className={`h-[550px] rounded-[2rem] overflow-hidden flex flex-col relative ${darkMode ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
              
              <div className="p-6 pt-12 flex justify-between items-center">
                <div>
                   <div className={`text-xs font-bold uppercase ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Good Morning</div>
                   <div className="font-bold text-lg">John Doe</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                   <Users className="w-full h-full p-2 opacity-50"/>
                </div>
              </div>

              <div className="flex-1 px-4 flex flex-col gap-4">
                <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                  {Object.entries(HERO_ACTIONS).map(([key, action]) => (
                    <button 
                      key={key} 
                      onClick={() => setHeroTab(key as any)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        heroTab === key ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                      }`}
                    >
                      {action.title.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <div className={`flex-1 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${currentHeroAction.color} ${currentHeroAction.textColor}`}>
                   <div className="space-y-2">
                     <div className="p-3 bg-white/20 w-fit rounded-xl backdrop-blur-sm">
                       <currentHeroAction.icon className="w-6 h-6" />
                     </div>
                     <h3 className="text-2xl font-bold">{currentHeroAction.title}</h3>
                     <p className="opacity-80 text-sm font-medium leading-relaxed">{currentHeroAction.subtitle}</p>
                   </div>
                   
                   {/* ACTION BUTTON WITH LINK */}
                   <Link href={currentHeroAction.link} className="w-full py-4 bg-white text-black rounded-xl font-bold flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform">
                     {currentHeroAction.buttonText} <ChevronRight className="w-4 h-4"/>
                   </Link>
                </div>
                
                <div className={`p-4 rounded-2xl mb-4 flex items-center gap-4 ${darkMode ? 'bg-white/5' : 'bg-white border'}`}>
                   <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 font-bold"><Zap className="w-5 h-5"/></div>
                   <div className="flex-1">
                     <div className="text-sm font-bold">Promo 50% Off</div>
                     <div className="text-xs opacity-60">Expires in 2h</div>
                   </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --- BENTO GRID FEATURES --- */}
      <section id="features" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Everything <span className="text-gray-400">in one place.</span></h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-3 md:grid-rows-2 gap-4 h-auto md:h-[600px]">
          
          {/* Large Card: Food - Added Link */}
          <div className={`md:col-span-2 row-span-2 rounded-3xl p-8 relative overflow-hidden group transition-all duration-300 hover:shadow-2xl ${
            darkMode ? 'bg-[#111] border border-white/10' : 'bg-white border border-gray-200'
          }`}>
             <div className="relative z-10 flex flex-col justify-between h-full">
               <div>
                 <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mb-6 text-black">
                   <ShoppingCart className="w-6 h-6" />
                 </div>
                 <h3 className="text-3xl font-bold mb-2">Food & Groceries</h3>
                 <p className="opacity-60 max-w-sm">From local Bukas to 5-star restaurants, and weekly grocery runs. Delivered hot and fresh.</p>
               </div>
               {/* Linked Button */}
               <Link href="/food" className="w-fit mt-8 px-6 py-3 rounded-full border border-current font-bold hover:bg-yellow-500 hover:border-yellow-500 hover:text-black transition-colors">
                 Start Shopping
               </Link>
             </div>
             <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-10 group-hover:opacity-20 transition-opacity">
                <div className="w-full h-full bg-yellow-500" style={{ clipPath: 'polygon(20% 0%, 100% 0, 100% 100%, 0% 100%)' }}></div>
             </div>
             <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-gradient-to-br from-orange-400 to-red-500 rounded-full blur-3xl opacity-20"></div>
          </div>

          {/* Medium Card: Rides - Added Link Wrapper */}
          <Link href="/ride" className={`rounded-3xl p-8 flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300 ${
             darkMode ? 'bg-[#151515] border border-white/10' : 'bg-blue-50 border border-blue-100'
          }`}>
             <div className="flex justify-between items-start">
               <Truck className={`w-10 h-10 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
               <div className={`px-3 py-1 rounded-full text-xs font-bold ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-200 text-blue-800'}`}>Fast</div>
             </div>
             <div>
               <h3 className="text-2xl font-bold mb-1">Ride Hailing</h3>
               <p className="opacity-60 text-sm">Safe travel, 24/7.</p>
             </div>
          </Link>

          {/* Medium Card: Logistics - Added Link Wrapper */}
          <Link href="/logistics" className={`rounded-3xl p-8 flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300 ${
             darkMode ? 'bg-[#151515] border border-white/10' : 'bg-green-50 border border-green-100'
          }`}>
             <div className="flex justify-between items-start">
               <Package className={`w-10 h-10 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
               <div className={`px-3 py-1 rounded-full text-xs font-bold ${darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-200 text-green-800'}`}>Secure</div>
             </div>
             <div>
               <h3 className="text-2xl font-bold mb-1">Logistics</h3>
               <p className="opacity-60 text-sm">Send packages instantly.</p>
             </div>
          </Link>

        </div>
      </section>

      {/* --- ECOSYSTEM TABS (Accordion with Buttons) --- */}
      <section id="ecosystem" className={`py-24 border-t ${darkMode ? 'bg-[#0a0a0a] border-white/5' : 'bg-gray-50 border-black/5'}`}>
         <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              
              <div className="flex-1 space-y-8">
                 <h2 className="text-4xl font-black tracking-tight">Built for <span className="text-yellow-500">everyone.</span></h2>
                 
                 <div className="space-y-3">
                    {ECOSYSTEM_TABS.map(tab => {
                      const isActive = activeTab === tab.id;
                      const content = ECOSYSTEM_CONTENT[tab.id as keyof typeof ECOSYSTEM_CONTENT];

                      return (
                        <div 
                          key={tab.id} 
                          onClick={() => setActiveTab(tab.id)}
                          className={`group rounded-2xl transition-all duration-300 border-l-4 cursor-pointer overflow-hidden ${
                            isActive 
                            ? 'bg-yellow-500/5 border-yellow-500 pb-6' 
                            : 'hover:bg-gray-100 dark:hover:bg-white/5 border-transparent py-4'
                          }`}
                        >
                           <div className={`flex items-center gap-4 px-6 ${isActive ? 'pt-6' : ''}`}>
                              <tab.icon className={`w-6 h-6 transition-colors ${isActive ? 'text-yellow-600' : 'opacity-50 group-hover:opacity-100'}`} />
                              <h3 className={`text-xl font-bold transition-colors ${isActive ? 'text-yellow-600' : ''}`}>{tab.label}</h3>
                           </div>

                           <div className={`grid transition-all duration-300 ease-in-out ${isActive ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
                             <div className="overflow-hidden">
                               <div className="px-6 pl-16">
                                 <p className="opacity-70 text-sm leading-relaxed mb-6 max-w-sm">
                                   {content.desc}
                                 </p>
                                 <Link 
                                   href={
                                     tab.id === 'vendor' ? '/vendor/register' :
                                     tab.id === 'rider' ? '/rider/register' :
                                     '/sign-up'
                                   }
                                   className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-transform hover:translate-x-1 ${
                                     darkMode 
                                     ? 'bg-white text-black hover:bg-gray-200' 
                                     : 'bg-black text-white hover:bg-gray-800'
                                   }`}
                                 >
                                   {content.cta} 
                                   <ArrowRight className="w-4 h-4" />
                                 </Link>
                               </div>
                             </div>
                           </div>
                        </div>
                      );
                    })}
                 </div>
              </div>
              
              <div className="flex-1 h-[500px] relative flex items-center justify-center">
                 <div className={`absolute inset-0 rounded-[2.5rem] rotate-3 transition-colors duration-500 ${darkMode ? 'bg-[#151515] border border-white/5' : 'bg-white border border-black/5 shadow-2xl'}`}></div>
                 
                 <div className={`relative z-10 w-full h-full rounded-[2.5rem] overflow-hidden flex items-center justify-center transition-colors duration-500 ${darkMode ? 'bg-[#111]' : 'bg-gray-100'}`}>
                    
                    <div key={activeTab} className="animate-in fade-in zoom-in-95 duration-500 w-full h-full flex items-center justify-center p-8">
                       <Image 
                         src={ECOSYSTEM_CONTENT[activeTab as keyof typeof ECOSYSTEM_CONTENT].image} 
                         alt={ECOSYSTEM_CONTENT[activeTab as keyof typeof ECOSYSTEM_CONTENT].title}
                         width={500} 
                         height={600}
                         className="object-contain w-full h-full drop-shadow-2xl"
                         priority
                       />
                    </div>

                    <div className="absolute bottom-6 right-6 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold text-current">
                       {ECOSYSTEM_CONTENT[activeTab as keyof typeof ECOSYSTEM_CONTENT].title}
                    </div>
                 </div>
              </div>

            </div>
         </div>
      </section>

      {/* --- MEGA FOOTER --- */}
      <footer className={`relative py-20 overflow-hidden ${darkMode ? 'bg-black border-t border-white/10' : 'bg-white border-t border-black/5'}`}>
        
        <div className="absolute -bottom-10 -left-10 pointer-events-none select-none opacity-[0.03]">
          <span className="text-[20rem] font-black leading-none tracking-tighter truncate">Asoose</span>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
            
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-black border border-yellow-500">A</div>
                <span className="text-2xl font-bold tracking-tight">Asoose</span>
              </div>
              <p className="text-sm opacity-60 leading-relaxed max-w-xs">
                The operating system for your daily life. Moving people, goods, and payments across Nigeria with speed and trust.
              </p>
              <div className="flex gap-4 pt-2">
                <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${darkMode ? 'border-white/20 hover:bg-white/10' : 'border-black/10 hover:bg-black/5'}`}>
                  <div className="w-5 h-5 bg-current rounded-full opacity-20"></div>
                  <div className="text-left">
                    <div className="text-[10px] uppercase font-bold opacity-60">Download on the</div>
                    <div className="text-xs font-bold leading-none">App Store</div>
                  </div>
                </button>
                <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${darkMode ? 'border-white/20 hover:bg-white/10' : 'border-black/10 hover:bg-black/5'}`}>
                  <div className="w-5 h-5 bg-current rounded-tr-lg opacity-20"></div>
                  <div className="text-left">
                    <div className="text-[10px] uppercase font-bold opacity-60">Get it on</div>
                    <div className="text-xs font-bold leading-none">Google Play</div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-6">Ecosystem</h4>
              <ul className="space-y-4 text-sm opacity-70">
                <li><a href="#" className="hover:text-yellow-500 transition-colors hover:opacity-100">Ride Hailing</a></li>
                <li><a href="#" className="hover:text-yellow-500 transition-colors hover:opacity-100">Food Delivery</a></li>
                <li><a href="#" className="hover:text-yellow-500 transition-colors hover:opacity-100">Logistics</a></li>
                <li><Link href="/vendor/register" className="hover:text-yellow-500 transition-colors hover:opacity-100">Vendor Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6">Join Us</h4>
              <ul className="space-y-4 text-sm opacity-70">
                <li><Link href="/vendor/register" className="hover:text-yellow-500 transition-colors hover:opacity-100">Become a Vendor</Link></li>
                <li><Link href="/rider/register" className="hover:text-yellow-500 transition-colors hover:opacity-100">Become a Rider</Link></li>
                <li><Link href="/sign-up" className="hover:text-yellow-500 transition-colors hover:opacity-100">Sign Up</Link></li>
                <li><a href="#" className="hover:text-yellow-500 transition-colors hover:opacity-100">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6">Legal</h4>
              <ul className="space-y-4 text-sm opacity-70">
                <li><a href="#" className="hover:text-yellow-500 transition-colors hover:opacity-100">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-yellow-500 transition-colors hover:opacity-100">Terms of Service</a></li>
                <li><Link href="/rider/register" className="hover:text-yellow-500 transition-colors hover:opacity-100">Driver Agreement</Link></li>
                <li><a href="#" className="hover:text-yellow-500 transition-colors hover:opacity-100">Security</a></li>
              </ul>
            </div>

          </div>

          <div className={`pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 ${darkMode ? 'border-white/10' : 'border-black/5'}`}>
            <div className="text-sm opacity-40 font-medium">
              © 2025 Asoose Technologies Inc. Lagos, Nigeria.
            </div>
            
            <div className="flex gap-4">
              {['Twitter', 'Instagram', 'LinkedIn', 'Facebook'].map((social) => (
                <a key={social} href="#" className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  darkMode ? 'bg-white/5 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'
                }`}>
                  <span className="sr-only">{social}</span>
                  <div className="w-4 h-4 rounded-sm border-2 border-current opacity-60"></div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}