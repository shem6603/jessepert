//src/app/dashboard/page.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { RealTimeMarkPaperScanner } from "@/components/RealTimeMarkPaperScanner";
import BatchScanner from "@/components/BatchScanner";
import LoginButton from "@/components/LoginButton";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"batch" | "live">("batch");

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] min-h-screen items-center justify-center bg-soft-teal px-4">
        <div
          className="h-12 w-12 animate-spin rounded-full border-2 border-sky-blue border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="relative isolate flex min-h-[100dvh] min-h-screen w-full items-center justify-center overflow-x-hidden bg-soft-teal px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute top-[10%] left-[-10%] h-96 w-96 rounded-full bg-sky-blue/15 blur-3xl" />
          <div className="absolute bottom-[10%] right-[-10%] h-96 w-96 rounded-full bg-dark-teal/10 blur-3xl" />
        </div>

        <section className="w-full max-w-xl rounded-2xl border border-dark-teal/10 bg-white/85 p-6 shadow-lg backdrop-blur-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <Image
              src="/logo.png"
              alt="Jesspert Logo"
              width={160}
              height={54}
              className="h-auto w-auto max-w-[140px] object-contain sm:max-w-[160px]"
              style={{ width: "auto", height: "auto" }}
              priority
            />
            <Link
              href="/"
              className="text-sm font-semibold text-dark-teal/80 underline-offset-4 hover:underline"
            >
              Back to home
            </Link>
          </div>

          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
            Sign in to open your dashboard
          </h1>
          <p className="mt-2 text-sm text-navy/70 sm:text-base">
            Your dashboard is where you’ll upload papers, track results, and save
            time on marking.
          </p>

          <div className="mt-6">
            <LoginButton />
          </div>

          <p className="mt-4 text-xs text-navy/55">
            Tip: If the popup is blocked, we’ll fall back to a redirect sign-in.
          </p>
        </section>
      </main>
    );
  }

  return (
    <div className="dashboard-theme bg-[#0e0e0e] text-on-surface font-body h-screen flex overflow-hidden antialiased">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="lg:ml-64 flex-1 flex flex-col relative h-full bg-surface">
        <DashboardTopBar
          user={user}
          onMenuOpen={() => setSidebarOpen(true)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
          {activeTab === 'batch' ? (
            <BatchScanner />
          ) : (
            <RealTimeMarkPaperScanner />
          )}
        </div>
      </main>
    </div>
  );
}
