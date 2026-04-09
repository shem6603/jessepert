"use client";

import { useAuth } from "@/context/AuthContext";
import { LogIn, LogOut } from "lucide-react";
import Image from "next/image";

export default function LoginButton() {
  const { user, loading, loginWithGoogle, logout } = useAuth();

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className="touch-manipulation min-h-[44px] w-full min-[480px]:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl bg-gray-200 text-gray-500 font-bold text-base flex items-center justify-center animate-pulse"
      >
        Loading...
      </button>
    );
  }

  // If user is logged in, show the profile and a Logout button
  if (user) {
    return (
      <div className="flex flex-row flex-wrap items-center justify-end gap-2 sm:gap-4 w-full min-[480px]:w-auto max-w-full">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2 bg-white/50 backdrop-blur-sm rounded-xl shadow-sm border border-dark-teal/10 max-w-[min(100%,14rem)] sm:max-w-none">
          {user.photoURL ? (
            <Image src={user.photoURL} alt="Profile" width={32} height={32} className="rounded-full shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-sky-blue/20 shrink-0" aria-hidden="true" />
          )}
          <span className="text-navy font-medium text-xs sm:text-sm truncate sm:whitespace-nowrap">
            {user.displayName || user.email}
          </span>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="touch-manipulation min-h-[44px] shrink-0 px-4 py-2.5 sm:px-8 sm:py-4 rounded-xl border-2 border-dark-teal/30 text-dark-teal bg-transparent font-bold text-sm sm:text-lg hover:bg-dark-teal/5 transition-all active:scale-95 inline-flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden />
          Log out
        </button>
      </div>
    );
  }

  // If not logged in, show the Google Login button 
  return (
    <button
      type="button"
      onClick={() => {
        void loginWithGoogle().catch(() => {
          /* Errors logged in AuthContext; avoid unhandled rejection */
        });
      }}
      className="touch-manipulation min-h-[44px] w-full min-[480px]:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl bg-sky-blue text-white font-bold text-base sm:text-lg hover:bg-sky-blue/90 shadow-xl shadow-sky-blue/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group"
    >
      <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
      Log in with Google
    </button>
  );
}
