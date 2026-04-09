//src/app/dashboard/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { MarkPaperUpload } from "@/components/dashboard/MarkPaperUpload";

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

  return (
    <div className="flex min-h-[100dvh] min-h-screen bg-soft-teal pt-[env(safe-area-inset-top)]">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-screen">
        <DashboardTopBar
          user={user}
          onMenuOpen={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-3xl">
            <MarkPaperUpload />
          </div>
        </main>
      </div>
    </div>
  );
}
