"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import type { User } from "firebase/auth";

type DashboardTopBarProps = {
  user: User | null;
  onMenuOpen: () => void;
  activeTab: "batch" | "live";
  setActiveTab: (tab: "batch" | "live") => void;
};

export function DashboardTopBar({ user, onMenuOpen, activeTab, setActiveTab }: DashboardTopBarProps) {
  const firstName =
    user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "User";

  return (
    <header className="docked full-width bg-[#0e0e0e] flex justify-between items-center w-full px-8 py-4 z-40 sticky top-0 font-headline tracking-tight border-b border-surface-variant">
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onMenuOpen}
          className="text-on-surface-variant hover:text-on-surface lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>  
        <nav className="flex gap-8">
          <button 
            onClick={() => setActiveTab("batch")}
            className={`pb-1 font-bold text-sm scale-95 active:scale-90 transition-all ${activeTab === 'batch' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Batch Upload
          </button>
          <button 
            onClick={() => setActiveTab("live")}
            className={`pb-1 font-bold text-sm scale-95 active:scale-90 transition-all ${activeTab === 'live' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Live Scanner
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:flex items-center bg-[#201f1f] rounded-full px-4 py-2 ring-1 ring-white/5">
          <span className="material-symbols-outlined text-on-surface-variant text-sm mr-2">search</span>
          <input 
            className="bg-transparent border-none text-sm text-on-surface focus:ring-0 p-0 w-48 placeholder-outline outline-none" 
            placeholder="Search..." 
            type="text"
            disabled
          />
        </div>
        <button className="text-on-surface-variant flex items-center justify-center hover:text-on-surface transition-colors cursor-not-allowed">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant/15 flex items-center justify-center text-xs font-bold text-on-surface">
          {user?.photoURL ? (
            <Image
              src={user.photoURL}
              alt="Profile"
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            firstName.slice(0, 1).toUpperCase()
          )}
        </div>
      </div>
    </header>
  );
}
