"use client"

import { 
  ArrowRight, Package, ShoppingBag, Truck, Car, Clock, Zap, TrendingUp, Shield, Moon, Sun, Menu, X 
} from 'lucide-react';
import { useState } from 'react';

function App() {
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={isDark ? "min-h-screen bg-zinc-900 text-white" : "min-h-screen bg-zinc-50"}>
      {/* Navbar */}
      <nav className={isDark ? "fixed top-0 w-full bg-zinc-800/90 backdrop-blur-md border-b border-zinc-700 z-50" : "fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-zinc-200 z-50"}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className={`font-bold text-2xl tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>Asoose</div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#services" className={`text-sm font-medium ${isDark ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-900"}`}>Services</a>
            <a href="#features" className={`text-sm font-medium ${isDark ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-900"}`}>Platform</a>
            <a href="#partners" className={`text-sm font-medium ${isDark ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-900"}`}>Partners</a>
            <button className={isDark ? "px-5 py-2 bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-colors" : "px-5 py-2 bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"}>
              Sign In
            </button>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden flex items-center" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6 text-gray-500" /> : <Menu className="w-6 h-6 text-gray-500" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className={`md:hidden px-6 pb-4 ${isDark ? "bg-zinc-800" : "bg-white"}`}>
            <a href="#services" className="block text-gray-500 py-2 font-medium hover:text-orange-600">Services</a>
            <a href="#features" className="block text-gray-500 py-2 font-medium hover:text-orange-600">Platform</a>
            <a href="#partners" className="block text-gray-500 py-2 font-medium hover:text-orange-600">Partners</a>
            <button className={`w-full mt-2 px-5 py-2 text-white ${isDark ? "bg-orange-600 hover:bg-orange-700" : "bg-zinc-900 hover:bg-zinc-800"} transition-colors`}>Sign In</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className={`pt-32 pb-20 px-6 min-h-screen relative overflow-hidden ${isDark ? "bg-zinc-900" : "bg-zinc-50"}`}>
        <div className="max-w-7xl mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-3">
                <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-[5.5rem] leading-tight font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                  Coordination.<br/>
                  Scale.<br/>
                  <span className="text-orange-600">Seamless.</span>
                </h1>
                <p className={`text-base sm:text-lg font-light tracking-tight max-w-md pt-4 ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                  Enterprise-grade delivery, logistics, and ride infrastructure built to operate at scale.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-8">
                <button className="px-8 py-4 bg-orange-600 text-white font-medium text-lg hover:bg-orange-700 transition-colors flex items-center gap-2 group">
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className={isDark ? "px-8 py-4 border-2 border-orange-600 text-orange-600 font-medium text-lg hover:bg-orange-600 hover:text-white transition-colors" : "px-8 py-4 border-2 border-zinc-900 text-zinc-900 font-medium text-lg hover:bg-zinc-900 hover:text-white transition-colors"}>
                  For Business
                </button>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t ${isDark ? "border-zinc-700" : "border-zinc-200"}`}>
                <div>
                  <div className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>99.9%</div>
                  <div className={`text-sm mt-1 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Uptime SLA</div>
                </div>
                <div>
                  <div className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Sub-second</div>
                  <div className={`text-sm mt-1 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Dispatch latency</div>
                </div>
                <div>
                  <div className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>10K+</div>
                  <div className={`text-sm mt-1 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Concurrent orders</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative mt-12 lg:mt-0 w-full h-80 sm:h-96 lg:h-full">
              <svg className="w-full h-full" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.05"/>
                  </linearGradient>
                </defs>
                <circle cx="200" cy="200" r="150" fill="url(#flowGrad)" stroke="#f97316" strokeWidth="1" opacity="0.3"/>
                <g strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 80 200 Q 120 150, 160 120" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.6"/>
                  <path d="M 160 120 Q 200 100, 240 130" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.6"/>
                  <path d="M 240 130 Q 280 160, 300 220" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.6"/>
                  <path d="M 200 80 Q 240 120, 260 180" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.5"/>
                  <path d="M 260 180 Q 240 240, 180 280" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.5"/>
                  <circle cx="80" cy="200" r="6" fill="#f97316" opacity="0.8"/>
                  <circle cx="160" cy="120" r="6" fill="#f97316" opacity="0.8"/>
                  <circle cx="240" cy="130" r="6" fill="#f97316" opacity="0.8"/>
                  <circle cx="300" cy="220" r="6" fill="#f97316" opacity="0.8"/>
                  <circle cx="200" cy="80" r="6" fill="#f97316" opacity="0.8"/>
                  <circle cx="260" cy="180" r="6" fill="#f97316" opacity="0.8"/>
                  <circle cx="180" cy="280" r="6" fill="#f97316" opacity="0.8"/>
                  <circle cx="200" cy="200" r="8" fill="#f97316" opacity="1"/>
                </g>
                <text x="200" y="320" textAnchor="middle" fontSize="12" fill="#f97316" opacity="0.7" fontWeight="500">
                  Real-time coordination
                </text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className={`py-20 px-6 ${isDark ? "bg-zinc-800" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center lg:text-left">
            <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 ${isDark ? "text-white" : "text-zinc-900"}`}>Four systems.<br/>One platform.</h2>
            <p className={`text-sm sm:text-lg ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>Everything integrated and operating as a unified system.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-12 lg:col-span-7 bg-orange-600 p-10 text-white relative overflow-hidden group cursor-pointer hover:bg-orange-700 transition-colors">
              <div className="absolute right-10 bottom-10 opacity-10">
                <ShoppingBag className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <ShoppingBag className="w-12 h-12 mb-6" />
                <h3 className="text-2xl sm:text-4xl font-bold mb-4">Food &amp; Groceries</h3>
                <p className="text-sm sm:text-lg text-orange-50 mb-6 max-w-md">
                  From street food to supermarkets. 15,000+ restaurants and stores across Nigeria.
                </p>
                <div className="flex items-center gap-2 font-medium group-hover:gap-4 transition-all">
                  <span>Order now</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="sm:col-span-12 lg:col-span-5 bg-zinc-900 p-8 text-white relative overflow-hidden group cursor-pointer hover:bg-zinc-800 transition-colors">
              <div className="absolute right-6 top-6 opacity-10">
                <Truck className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <Truck className="w-10 h-10 mb-4" />
                <h3 className="text-xl sm:text-2xl font-bold mb-3">Logistics</h3>
                <p className="text-sm text-zinc-300 mb-4">
                  Same-day delivery. Document runs. Bulk transport.
                </p>
                <div className="flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
                  <span>Ship now</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="sm:col-span-12 lg:col-span-5 bg-white border-2 border-zinc-900 p-8 relative overflow-hidden group cursor-pointer hover:bg-zinc-50 transition-colors">
              <div className="absolute right-6 top-6 opacity-5">
                <Car className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <Car className="w-10 h-10 mb-4 text-zinc-900" />
                <h3 className="text-xl sm:text-2xl font-bold mb-3 text-zinc-900">Ride</h3>
                <p className="text-sm text-zinc-600 mb-4">
                  Point A to point B. Professional drivers. Fixed pricing.
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 group-hover:gap-3 transition-all">
                  <span>Book ride</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className={`sm:col-span-12 p-8 border-l-8 border-orange-600 ${isDark ? "bg-zinc-700" : "bg-zinc-100"}`}>
              <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                <div>
                  <Package className={`w-10 h-10 mb-4 ${isDark ? "text-orange-600" : "text-zinc-900"}`} />
                  <h3 className={`text-2xl font-bold mb-3 ${isDark ? "text-white" : "text-zinc-900"}`}>Business API</h3>
                  <p className={`max-w-2xl ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                    Integrate Asoose infrastructure into your platform. Delivery API, logistics endpoints, real-time tracking.
                  </p>
                </div>
                <button className={`px-6 py-3 font-medium transition-colors ${isDark ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}>
                  View Documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section id="features" className={`py-20 px-6 ${isDark ? "bg-zinc-900" : "bg-zinc-50"}`}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center lg:text-left">
            <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 ${isDark ? "text-white" : "text-zinc-900"}`}>Platform Capabilities</h2>
            <p className={`text-sm sm:text-lg ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Enterprise infrastructure designed for operational excellence and real-time coordination.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <ShoppingBag className="w-10 h-10 text-orange-600 mb-4" />, title: "Customer Ecosystem", text: "Unified ordering, payment processing, and real-time tracking across food, groceries, and logistics." },
              { icon: <Package className="w-10 h-10 text-orange-600 mb-4" />, title: "Vendor Management", text: "Store catalogs, menu management, order fulfillment, and performance analytics in one interface." },
              { icon: <Truck className="w-10 h-10 text-orange-600 mb-4" />, title: "Rider Operations", text: "GPS routing, earnings tracking, job dispatch, and performance metrics on demand." },
              { icon: <Zap className="w-10 h-10 text-orange-600 mb-4" />, title: "Real-time Dispatch", text: "Sub-second job matching, intelligent routing, and dynamic resource allocation across all services." },
              { icon: <Shield className="w-10 h-10 text-orange-600 mb-4" />, title: "Payment Infrastructure", text: "Secure transactions, multi-method support, settlement automation, and fraud prevention." },
              { icon: <TrendingUp className="w-10 h-10 text-orange-600 mb-4" />, title: "Admin Analytics", text: "System monitoring, order analytics, performance dashboards, and operational insights." },
            ].map((feature, idx) => (
              <div key={idx} className={`p-6 sm:p-8 border-l-4 border-orange-600 ${isDark ? "bg-zinc-800" : "bg-white"}`}>
                {feature.icon}
                <h3 className={`text-2xl font-bold mb-3 ${isDark ? "text-white" : "text-zinc-900"}`}>{feature.title}</h3>
                <p className={`text-sm ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section id="partners" className={`py-20 px-6 ${isDark ? "bg-zinc-800" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-8">
            <div>
              <div className={`inline-block px-3 py-1 text-sm font-bold mb-4 ${isDark ? "bg-orange-900/30 text-orange-400" : "bg-orange-100 text-orange-900"}`}>
                FOR OPERATORS
              </div>
              <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 ${isDark ? "text-white" : "text-zinc-900"}`}>
                Your business.<br/>
                Your terms.<br/>
                Our infrastructure.
              </h2>
              <p className={`text-sm sm:text-lg ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                Restaurant owner. Rider. Store manager. Driver. You control the operation. We provide the system.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className={`border-l-4 pl-4 ${isDark ? "border-orange-600" : "border-zinc-900"}`}>
                <div className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>₦180K</div>
                <div className={`text-sm ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>Avg. monthly earnings</div>
                <div className="text-xs mt-1 text-zinc-500">Active riders</div>
              </div>
              <div className="border-l-4 border-orange-600 pl-4">
                <div className={`text-2xl sm:text-3xl font-bold mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>72hrs</div>
                <div className={`text-sm ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>Avg. onboarding time</div>
                <div className="text-xs mt-1 text-zinc-500">From signup to first order</div>
              </div>
            </div>
          </div>

          <div className={`p-6 sm:p-10 border-2 ${isDark ? "bg-zinc-900 border-orange-600" : "bg-zinc-50 border-zinc-900"}`}>
            <div className="space-y-6">
              {[
                { icon: <TrendingUp className="w-6 h-6 text-orange-600 mt-1" />, title: "Real-time dashboard", text: "Track earnings, orders, and performance metrics as they happen." },
                { icon: <Shield className="w-6 h-6 text-orange-600 mt-1" />, title: "Insurance coverage", text: "Every delivery and ride backed by comprehensive protection." },
                { icon: <Clock className="w-6 h-6 text-orange-600 mt-1" />, title: "Flexible scheduling", text: "Work when you want. No minimum hours. No penalties." },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  {item.icon}
                  <div>
                    <h3 className={`font-bold text-lg mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>{item.title}</h3>
                    <p className={`text-sm ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>{item.text}</p>
                  </div>
                </div>
              ))}
              <button className={`w-full py-4 font-medium transition-colors mt-6 ${isDark ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}>
                Register as Partner
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={isDark ? "bg-zinc-900 text-white py-16 px-6" : "bg-zinc-900 text-white py-16 px-6"}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="font-bold text-3xl tracking-tight mb-2">Asoose</div>
              <p className="text-xs text-zinc-500 mb-4">Asoose Lodzexpert Integrated Nig. LTD.</p>
              <p className="text-sm text-zinc-400">
                Enterprise delivery and logistics infrastructure.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm">SERVICES</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li><a href="#services" className="hover:text-white transition-colors">Food Delivery</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Groceries</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Logistics</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Ride Booking</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm">PLATFORM</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li><a href="#features" className="hover:text-white transition-colors">Capabilities</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integration Guide</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm">COMPANY</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Safety</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between text-sm text-zinc-500 gap-4 sm:gap-0">
            <p>&copy; 2024 Asoose Lodzexpert Integrated Nig. LTD. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Legal</a>
              <button
                onClick={() => setIsDark(!isDark)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300 hover:text-white"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="text-xs font-medium">{isDark ? "Light" : "Dark"}</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
