//src/app/dashboard/page.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { RealTimeMarkPaperScanner } from "@/components/RealTimeMarkPaperScanner";
import LoginButton from "@/components/LoginButton";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="relative flex min-h-[100dvh] min-h-screen bg-soft-teal pt-[env(safe-area-inset-top)]">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] h-[28rem] w-[28rem] rounded-full bg-sky-blue/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-dark-teal/10 blur-3xl" />
      </div>
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-screen">
        <DashboardTopBar
          user={user}
          onMenuOpen={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
              <div className="space-y-6">
                <RealTimeMarkPaperScanner />
              </div>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-dark-teal/10 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
                  <h2 className="text-sm font-bold text-navy">Today</h2>
                  <p className="mt-1 text-sm text-navy/65">
                    Upload a paper and Jesspert will generate marks and feedback.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-soft-teal/60 p-4 ring-1 ring-dark-teal/10">
                      <p className="text-xs font-semibold text-navy/60">Papers marked</p>
                      <p className="mt-1 text-2xl font-extrabold text-navy">0</p>
                    </div>
                    <div className="rounded-2xl bg-soft-teal/60 p-4 ring-1 ring-dark-teal/10">
                      <p className="text-xs font-semibold text-navy/60">Time saved</p>
                      <p className="mt-1 text-2xl font-extrabold text-navy">—</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-dark-teal/10 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
                  <h2 className="text-sm font-bold text-navy">Tips for best results</h2>
                  <ul className="mt-3 space-y-2 text-sm text-navy/65">
                    <li className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-blue" aria-hidden />
                      Use bright lighting and avoid shadows.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-blue" aria-hidden />
                      Keep the page flat and capture the full sheet.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-blue" aria-hidden />
                      If handwriting is faint, try a closer shot.
                    </li>
                  </ul>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
