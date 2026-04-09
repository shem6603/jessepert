"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import type { User } from "firebase/auth";

type DashboardTopBarProps = {
  user: User | null;
  onMenuOpen: () => void;
};

export function DashboardTopBar({ user, onMenuOpen }: DashboardTopBarProps) {
  const firstName =
    user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Teacher";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-dark-teal/10 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
      <button
        type="button"
        onClick={onMenuOpen}
        className="touch-manipulation rounded-xl border border-dark-teal/15 p-2.5 text-navy hover:bg-soft-teal lg:hidden"
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
            className="shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
          />
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-blue/20 text-sm font-bold text-sky-blue"
            aria-hidden
          >
            {firstName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-navy sm:text-xl">
            Welcome back, {firstName}
          </h1>
          <p className="truncate text-xs text-navy/60 sm:text-sm">
            Mark papers faster with Jesspert
          </p>
        </div>
      </div>
    </header>
  );
}
