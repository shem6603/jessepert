"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  History,
  ScanLine,
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
    enabled: true,
  },
  { href: "/dashboard/scanner", label: "Live Scanner", icon: ScanLine, enabled: true },
  { href: "/dashboard/history", label: "History", icon: History, enabled: false },
  { href: "/dashboard/classes", label: "Classes", icon: Users, enabled: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, enabled: false },
] as const;

export function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const handleSignOut = () => {
    void logout().then(() => onClose());
  };

  const displayName = user?.displayName || user?.email || "Signed in";

  return (
    <div className="shrink-0 lg:w-72">
      <div
        role="presentation"
        className={`fixed inset-0 z-40 bg-navy/45 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex min-h-[100dvh] w-[min(20rem,100vw)] flex-col border-r border-dark-teal/10 bg-white/80 shadow-xl backdrop-blur-xl transition-transform duration-200 ease-out lg:relative lg:inset-auto lg:z-0 lg:min-h-screen lg:w-72 lg:max-w-none lg:translate-x-0 lg:bg-white/70 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-dark-teal/10 px-5 py-4 lg:py-5">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-soft-teal/60"
            onClick={onClose}
            aria-label="Go to home"
          >
            <Image
              src="/logo.png"
              alt="Jesspert"
              width={120}
              height={40}
              className="h-auto w-auto max-w-[120px] object-contain"
              priority={false}
            />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="touch-manipulation rounded-xl p-2 text-navy/70 hover:bg-soft-teal/60 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 px-4 py-5" aria-label="Dashboard">
          {navItems.map(({ href, label, icon: Icon, enabled }) => {
            const isActive = pathname === href;
            if (!enabled) {
              return (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-navy/45"
                  aria-disabled="true"
                >
                  <Icon className="h-5 w-5 shrink-0 text-dark-teal/35" aria-hidden />
                  <span className="flex-1">{label}</span>
                  <span className="rounded-full bg-navy/5 px-2 py-1 text-[11px] font-semibold text-navy/45">
                    Soon
                  </span>
                </div>
              );
            }

            return isActive ? (
              <Link
                key={label}
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-2xl bg-sky-blue/10 px-3 py-2.5 text-sm font-semibold text-sky-blue ring-1 ring-sky-blue/20"
                aria-current="page"
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                {label}
              </Link>
            ) : (
              <Link
                key={label}
                onClick={onClose}
                href={href}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-navy/70 transition hover:bg-soft-teal/60 hover:text-navy"
              >
                <Icon className="h-5 w-5 shrink-0 text-dark-teal/80" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="border-t border-dark-teal/10 p-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-3 ring-1 ring-dark-teal/10">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-blue/15 text-sm font-bold text-sky-blue"
                aria-hidden
              >
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy">
                  {displayName}
                </p>
                {user.email && (
                  <p className="truncate text-xs text-navy/55">{user.email}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="touch-manipulation inline-flex h-10 w-10 items-center justify-center rounded-xl border border-dark-teal/15 bg-white text-dark-teal transition hover:bg-soft-teal/60"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
