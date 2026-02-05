"use client";

import { useTheme } from "next-themes";
import {
  ShieldCheck,
  Zap,
  Users,
  Truck,
  Car,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";

export default function AboutPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  const darkMode = resolvedTheme === "dark";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main
        className={`flex-grow pt-20 ${darkMode ? "bg-[#0a0a0a] text-white" : "bg-white text-black"}`}
      >
        {/* HERO */}
        <section className="py-24 px-6 max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">
            About <span className="text-yellow-500">Asoose Lodzxpert</span>
          </h1>
          <p className="text-lg opacity-60">
            Asoose Lodzxpert is a logistics, mobility, and e-commerce company
            founded in 2023 with the mission to make last-mile delivery and
            shared transportation reliable, safe, and accessible.
          </p>
        </section>

        {/* DESCRIPTION */}
        <section
          className={`py-16 px-6 border-y ${darkMode ? "border-white/10" : "border-black/10"}`}
        >
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Our Story</h2>
            <p className="opacity-60 leading-relaxed mb-4">
              Our platform seamlessly connects people, vendors, drivers, and
              riders, addressing the real needs of our communities.
            </p>
            <p className="opacity-60 leading-relaxed">
              Our services include last-mile delivery, local e-commerce support,
              and car-sharing solutions, providing affordable and flexible
              mobility options that empower livelihoods and help local
              businesses grow. By leveraging technology and a deep understanding
              of local needs, we enable communities to move goods and people
              more efficiently, saving time, reducing barriers, and creating
              opportunities.
            </p>
          </div>
        </section>

        {/* SERVICES */}
        <section className="py-16 px-6 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">What We Do</h2>

          <div className="space-y-6">
            {[
              {
                icon: <Truck className="text-yellow-500" size={20} />,
                title: "Last-Mile Delivery",
                desc: "Reliable logistics support to ensure goods reach their destination safely and on time.",
              },
              {
                icon: <ShoppingBag className="text-yellow-500" size={20} />,
                title: "E-Commerce Support",
                desc: "Connecting local vendors to a wider audience with seamless delivery solutions.",
              },
              {
                icon: <Car className="text-yellow-500" size={20} />,
                title: "Car-Sharing",
                desc: "Affordable and flexible mobility options designed to create new opportunities.",
              },
            ].map((service, i) => (
              <div key={i} className="flex gap-4">
                <div className="mt-1">{service.icon}</div>
                <div>
                  <h3 className="font-bold mb-1">{service.title}</h3>
                  <p className="text-sm opacity-60">{service.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* IMPACT */}
        <section
          className={`py-16 px-6 ${darkMode ? "bg-white/5" : "bg-gray-50"}`}
        >
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Our Impact</h2>
            <p className="opacity-60 leading-relaxed">
              We're committed to saving time, reducing barriers, and creating
              opportunities. By understanding the heartbeat of the community, we
              enable more efficient movement, helping local businesses grow and
              individuals thrive.
            </p>
          </div>
        </section>

        {/* VALUES */}
        <section className="py-16 px-6 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Our Values</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              {
                icon: <ShieldCheck className="text-yellow-500" size={20} />,
                text: "Reliable",
              },
              {
                icon: <Zap className="text-yellow-500" size={20} />,
                text: "Efficient",
              },
              {
                icon: <Users className="text-yellow-500" size={20} />,
                text: "Community-Driven",
              },
              {
                icon: <ArrowRight className="text-yellow-500" size={20} />,
                text: "Accessible",
              },
            ].map((val, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="flex justify-center">{val.icon}</div>
                <div className="text-sm opacity-60">{val.text}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
