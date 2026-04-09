"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { RealTimeMarkPaperScanner } from "@/components/RealTimeMarkPaperScanner";
import { AlertCircle, Info } from "lucide-react";

export default function ScannerPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative flex min-h-[100dvh] min-h-screen bg-soft-teal pt-[env(safe-area-inset-top)]">
      {/* Background blobs */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute top-[-10%] left-[-10%] h-[28rem] w-[28rem] rounded-full bg-sky-blue/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-dark-teal/10 blur-3xl" />
      </div>

      {/* Sidebar */}
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-screen">
        {/* Top bar */}
        <DashboardTopBar
          user={user}
          onMenuOpen={() => setSidebarOpen(true)}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl space-y-6">
            {/* Page header */}
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">
                Real-Time OMR Scanner
              </h1>
              <p className="text-sm text-navy/65">
                Advanced AI-powered optical mark recognition for instant
                grading
              </p>
            </div>

            {/* Info alert */}
            <div className="flex gap-3 rounded-2xl border border-sky-blue/20 bg-sky-blue/5 p-4">
              <Info className="h-5 w-5 shrink-0 text-sky-blue" />
              <div className="text-sm text-navy/75">
                <p className="font-medium text-navy">New Feature!</p>
                <p className="mt-1">
                  Point your camera at a multiple-choice answer sheet for
                  instant, real-time feedback. Perfect for marking papers in
                  the classroom or remotely.
                </p>
              </div>
            </div>

            {/* Scanner component */}
            <RealTimeMarkPaperScanner />

            {/* Feature breakdown */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* How it works */}
              <div className="rounded-3xl border border-dark-teal/10 bg-white/80 p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-extrabold text-navy">
                  How It Works
                </h2>
                <ol className="space-y-3 text-sm text-navy/75">
                  {[
                    'Click "Start Scanner" to access your camera',
                    "Position the answer sheet flat and perpendicular to camera",
                    "Scanner detects bubbles and shows real-time feedback",
                    "✓ Green = Correct, ✕ Red = Incorrect",
                    "Review results and submit for record-keeping",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-blue/15 text-xs font-bold text-sky-blue">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Best practices */}
              <div className="rounded-3xl border border-dark-teal/10 bg-white/80 p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-extrabold text-navy">
                  Best Practices
                </h2>
                <ul className="space-y-3 text-sm text-navy/75">
                  {[
                    { icon: "📐", text: "Align paper flat against table surface" },
                    {
                      icon: "💡",
                      text: "Use natural light or well-positioned overhead light",
                    },
                    {
                      icon: "🚫",
                      text: "Avoid shadows and reflections on the page",
                    },
                    {
                      icon: "📸",
                      text: "Keep camera steady; avoid excessive movement",
                    },
                    {
                      icon: "⭕",
                      text: "Ensure bubbles are completely filled or completely empty",
                    },
                  ].map(({ icon, text }, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="shrink-0 text-sky-blue">{icon}</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Limitations note */}
            <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-900">
                <p className="font-medium">Note:</p>
                <p className="mt-1">
                  Scanner works best with standard OMR bubble sheets (CSEC,
                  PEP, CAPE formats). Ensure good lighting and clear bubble
                  marks for optimal accuracy. Complex layouts or handwritten
                  notes may affect detection.
                </p>
              </div>
            </div>

            {/* FAQ */}
            <div className="rounded-3xl border border-dark-teal/10 bg-white/80 p-6 shadow-sm">
              <h2 className="mb-6 text-lg font-extrabold text-navy">FAQ</h2>
              <div className="space-y-6">
                {[
                  {
                    q: "Will this work on my phone?",
                    a: "Yes! The scanner works on iOS 14.5+ and Android 5.0+. For best results, use a device with a good rear-facing camera.",
                  },
                  {
                    q: "What if the scanner doesn't detect bubbles?",
                    a: "Check lighting, paper angle, and bubble clarity. Try tilting the paper slightly. Make sure bubbles are fully filled or empty (no partial marks).",
                  },
                  {
                    q: "Can I correct detected answers?",
                    a: 'Currently, the scanner shows live detection. You can reset and re-scan, or manually edit in the results panel before submitting.',
                  },
                  {
                    q: "Is my camera feed stored or recorded?",
                    a: "No. The camera feed is processed locally on your device and never transmitted to our servers. Only the detected answers are submitted.",
                  },
                  {
                    q: "How accurate is the detection?",
                    a: "Accuracy depends on paper quality, lighting, and bubble clarity. With ideal conditions, detection accuracy is typically 98%+. Always review results before final submission.",
                  },
                ].map(({ q, a }, i) => (
                  <div key={i}>
                    <h3 className="font-semibold text-navy">{q}</h3>
                    <p className="mt-2 text-sm text-navy/70">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}