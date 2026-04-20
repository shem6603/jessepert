"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { X } from "lucide-react";

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const handleSignOut = () => {
    void logout().then(() => onClose());
  };

  return (
    <>
      <div
        role="presentation"
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`flex flex-col h-screen fixed left-0 top-0 py-8 gap-y-6 docked h-full w-64 bg-[#121212] z-50 transition-transform duration-200 ease-out lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-8 flex justify-between items-center mb-4">
          <div>
            <h1 className="uppercase font-bold text-primary text-2xl tracking-tight font-headline">Jesspert</h1>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mt-1">The Kinetic Scholar</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-on-surface hover:bg-surface-variant lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-6 mb-4">
          <button className="w-full bg-primary text-on-primary py-3 rounded-full font-bold text-sm hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(184,253,75,0.15)] ring-1 ring-primary/20">
            Start Grading
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-y-2 pr-6">
          <Link href="/dashboard" onClick={onClose} className={`flex items-center gap-4 px-8 py-3 rounded-r-full font-headline uppercase tracking-widest text-xs font-bold transition-all duration-300 ease-in-out ${pathname === '/dashboard' ? 'text-primary bg-[#1a1a1a] border-l-4 border-primary' : 'text-on-surface-variant hover:bg-[#1a1a1a] hover:scale-[1.02]'}`}>
            <span className="material-symbols-outlined text-lg" style={pathname === '/dashboard' ? { fontVariationSettings: "'FILL' 1" } : {}}>edit_document</span>
            Mark Papers
          </Link>
          <Link href="/dashboard/history" onClick={onClose} className={`flex items-center gap-4 px-8 py-3 rounded-r-full font-headline uppercase tracking-widest text-xs font-bold transition-all duration-300 ease-in-out ${pathname === '/dashboard/history' ? 'text-primary bg-[#1a1a1a] border-l-4 border-primary' : 'text-on-surface-variant hover:bg-[#1a1a1a] hover:scale-[1.02]'}`}>
            <span className="material-symbols-outlined text-lg" style={pathname === '/dashboard/history' ? { fontVariationSettings: "'FILL' 1" } : {}}>history</span>
            History
          </Link>
          <Link href="/dashboard/classes" onClick={onClose} className={`flex items-center gap-4 px-8 py-3 rounded-r-full font-headline uppercase tracking-widest text-xs font-bold transition-all duration-300 ease-in-out ${pathname === '/dashboard/classes' ? 'text-primary bg-[#1a1a1a] border-l-4 border-primary' : 'text-on-surface-variant hover:bg-[#1a1a1a] hover:scale-[1.02]'}`}>
            <span className="material-symbols-outlined text-lg" style={pathname === '/dashboard/classes' ? { fontVariationSettings: "'FILL' 1" } : {}}>groups</span>
            Classes
          </Link>
          <Link href="/dashboard/settings" onClick={onClose} className={`flex items-center gap-4 px-8 py-3 rounded-r-full font-headline uppercase tracking-widest text-xs font-bold transition-all duration-300 ease-in-out ${pathname === '/dashboard/settings' ? 'text-primary bg-[#1a1a1a] border-l-4 border-primary' : 'text-on-surface-variant hover:bg-[#1a1a1a] hover:scale-[1.02]'}`}>
            <span className="material-symbols-outlined text-lg" style={pathname === '/dashboard/settings' ? { fontVariationSettings: "'FILL' 1" } : {}}>settings</span>
            Settings
          </Link>
        </nav>

        <div className="mt-auto pr-6 flex flex-col gap-y-2">
          <Link href="/dashboard/help" onClick={onClose} className={`flex items-center gap-4 px-8 py-3 rounded-r-full font-headline uppercase tracking-widest text-xs font-bold transition-all duration-300 ease-in-out ${pathname === '/dashboard/help' ? 'text-primary bg-[#1a1a1a] border-l-4 border-primary' : 'text-on-surface-variant hover:bg-[#1a1a1a] hover:scale-[1.02]'}`}>
            <span className="material-symbols-outlined text-lg" style={pathname === '/dashboard/help' ? { fontVariationSettings: "'FILL' 1" } : {}}>help</span>
            Help Center
          </Link>
          {user && (
            <button onClick={handleSignOut} className="flex items-center gap-4 px-8 py-3 text-error hover:bg-[#1a1a1a] hover:scale-[1.02] transition-transform rounded-r-full font-headline uppercase tracking-widest text-xs font-bold text-left w-full">
              <span className="material-symbols-outlined text-lg border-l-0">logout</span>
              Sign Out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
