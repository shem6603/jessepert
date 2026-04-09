"use client";

import Image from "next/image";
import { Bell, Menu, Search } from "lucide-react";
import type { User } from "firebase/auth";

type DashboardTopBarProps = {
  user: User | null;
  onMenuOpen: () => void;
};

export function DashboardTopBar({ user, onMenuOpen }: DashboardTopBarProps) {
  const firstName =
    user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Teacher";

  return (
    <header className="sticky top-0 z-30 border-b border-dark-teal/10 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
      <button
        type="button"
        onClick={onMenuOpen}
        className="touch-manipulation rounded-2xl border border-dark-teal/15 bg-white/70 p-2.5 text-navy shadow-sm transition hover:bg-soft-teal/60 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        {user?.photoURL ? (
          <Image
            src={user.photoURL}
            alt="Profile"
            width={48}
            height={48}
            className="shrink-0 rounded-2xl border border-white/60 object-cover shadow-sm"
          />
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-blue/15 text-sm font-bold text-sky-blue"
            aria-hidden
          >
            {firstName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-navy sm:text-lg">
            Welcome back, {firstName}
          </h1>
          <p className="truncate text-xs text-navy/60 sm:text-sm">
            Ready to mark papers in minutes?
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-3 md:flex">
        <label className="relative" aria-label="Search">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy/45">
            <Search className="h-4 w-4" aria-hidden />
          </span>
          <input
            type="search"
            placeholder="Search (coming soon)"
            disabled
            className="h-10 w-[280px] rounded-2xl border border-dark-teal/10 bg-white/70 pl-9 pr-3 text-sm text-navy placeholder:text-navy/40 shadow-sm outline-none ring-0 disabled:cursor-not-allowed"
          />
        </label>

        <button
          type="button"
          className="touch-manipulation inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-dark-teal/15 bg-white/70 text-navy shadow-sm transition hover:bg-soft-teal/60"
          aria-label="Notifications (coming soon)"
          title="Notifications (coming soon)"
          disabled
        >
          <Bell className="h-4 w-4" aria-hidden />
        </button>
      </div>
      </div>
    </header>
  );
}
