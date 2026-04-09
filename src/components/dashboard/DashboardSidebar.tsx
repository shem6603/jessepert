"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  History,
  Users,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
};

const navItems = [
  {
    href: "/dashboard",
    label: "Mark Papers",
    icon: ClipboardCheck,
    active: true,
  },
  { href: "#", label: "History", icon: History, active: false },
  { href: "#", label: "Classes", icon: Users, active: false },
  { href: "#", label: "Settings", icon: Settings, active: false },
] as const;

export function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const { user, logout } = useAuth();

  const handleSignOut = () => {
    void logout().then(() => onClose());
  };

  return (
    <div className="shrink-0 lg:w-64">
      <div
        role="presentation"
        className={`fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex min-h-[100dvh] w-[min(18rem,100vw)] flex-col border-r border-dark-teal/15 bg-white shadow-lg transition-transform duration-200 ease-out lg:relative lg:inset-auto lg:z-0 lg:min-h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-dark-teal/10 px-4 py-4 lg:py-5">
          <p className="font-bold tracking-tight text-navy">Jesspert</p>
          <button
            type="button"
            onClick={onClose}
            className="touch-manipulation rounded-lg p-2 text-navy/70 hover:bg-soft-teal lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Dashboard">
          {navItems.map(({ href, label, icon: Icon, active }) =>
            active ? (
              <Link
                key={label}
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl bg-sky-blue/12 px-3 py-3 text-sm font-semibold text-sky-blue ring-1 ring-sky-blue/25"
                aria-current="page"
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                {label}
              </Link>
            ) : (
              <button
                key={label}
                type="button"
                onClick={onClose}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-navy/65 transition-colors hover:bg-soft-teal hover:text-navy"
              >
                <Icon className="h-5 w-5 shrink-0 text-dark-teal/80" aria-hidden />
                {label}
              </button>
            ),
          )}
        </nav>

        {user && (
          <div className="border-t border-dark-teal/10 p-3">
            <button
              type="button"
              onClick={handleSignOut}
              className="touch-manipulation flex w-full items-center justify-center gap-2 rounded-xl border border-dark-teal/25 bg-white px-4 py-3 text-sm font-semibold text-dark-teal transition-colors hover:bg-dark-teal/5"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              Sign out
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
