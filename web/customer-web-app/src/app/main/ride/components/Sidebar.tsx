'use client';

import React from 'react';

/**
 * Sidebar — Pure layout container for the ride page.
 * All business logic (geocoding, status management) lives in
 * RideController, RideSelection, and dedicated hooks.
 */
export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-zinc-900 shadow-2xl z-20 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
      {children}
    </div>
  );
}

// --- Helper Components (Required for RideSelection to work) ---

export function SidebarSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function SidebarDivider() {
  return <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800" />;
}