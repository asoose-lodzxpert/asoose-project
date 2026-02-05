"use client";

import React, { useMemo } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  ShoppingBag,
  Users,
  Activity,
  Minus,
} from "lucide-react";

export interface OverviewMetric {
  label: string;
  value: string | number;
  change: number;
  trend: "up" | "down" | "neutral";
  icon?: any;
}

interface OverviewCardsProps {
  metrics: OverviewMetric[] | null;
  subtext?: string;
}

const getIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("revenue") || l.includes("sales") || l.includes("value"))
    return Banknote;
  if (l.includes("order")) return ShoppingBag;
  if (l.includes("user") || l.includes("customer") || l.includes("store"))
    return Users;
  return Activity;
};

export default function OverviewCards({
  metrics,
  subtext,
}: OverviewCardsProps) {
  // Memoize formatters to prevent recreation on every render
  const nairaFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0, // Keep dashboard clean
        minimumFractionDigits: 0,
      }),
    [],
  );

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-NG"), []);

  // Handle loading or invalid data gracefully
  if (!metrics || !Array.isArray(metrics)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[#1E293B] h-32 rounded-xl animate-pulse border border-gray-800"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon || getIcon(metric.label);
        const isPositive = metric.trend === "up";
        const isNeutral = metric.trend === "neutral";
        const isRevenue =
          metric.label.toLowerCase().includes("revenue") ||
          metric.label.toLowerCase().includes("value");

        // Format value based on type and context
        const displayValue =
          typeof metric.value === "number"
            ? isRevenue
              ? nairaFormatter.format(metric.value)
              : numberFormatter.format(metric.value)
            : metric.value;

        return (
          <div
            key={index}
            className="bg-[#1E293B] border border-gray-800 p-5 rounded-xl hover:border-gray-700 transition-colors shadow-sm group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-gray-800/50 rounded-lg text-gray-400 group-hover:text-white group-hover:bg-gray-700 transition-colors">
                <Icon className="w-5 h-5" />
              </div>

              <div
                className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                  isNeutral
                    ? "bg-gray-800 text-gray-400"
                    : isPositive
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                }`}
              >
                {isNeutral ? (
                  <Minus className="w-3 h-3" />
                ) : isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{Math.abs(metric.change)}%</span>
              </div>
            </div>

            <div>
              <p className="text-gray-400 text-sm font-medium mb-1">
                {metric.label}
              </p>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {displayValue}
              </h3>

              {subtext && (
                <p className="text-xs text-gray-500 mt-2 font-medium">
                  {subtext}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
