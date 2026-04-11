"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  StopCircle,
  Loader2,
  Check,
  X,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────
   Answer key – in production this comes from props / backend
   ──────────────────────────────────────────────────────────── */

const MOCK_ANSWER_KEY: Record<string, string> = {
  q1: "A",
  q2: "B",
  q3: "C",
  q4: "D",
  q5: "A",
};

/* ── Types ── */

interface GradedQuestion {
  questionNumber: number;
  expected: string | null;
  detected: string | null;
  isCorrect: boolean | null;
  confidence: number;
}

interface ScanSummary {
  totalDetected: number;
  totalGraded: number;
  correct: number;
  incorrect: number;
  score: number;
}

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */

export function RealTimeMarkPaperScanner() {
  /* ── refs ── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  /* ── state ── */
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<
    "pending" | "granted" | "denied"
  >("pending");
  const [error, setError] = useState<string | null>(null);

  // Live grading state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveScanning, setLiveScanning] = useState(false);
  const [results, setResults] = useState<GradedQuestion[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);

  /* ──────────────────────────────────────────────────────────
     1. Request camera access
     ────────────────────────────────────────────────────────── */
  const requestCameraAccess = useCallback(async () => {
    try {
      setCameraPermission("pending");
      setError(null);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraPermission("granted");
      setCameraActive(true);
    } catch (err) {
      const msg =
        err instanceof DOMException ? err.message : "Unknown camera error";
      setError(`Camera access denied: ${msg}`);
      setCameraPermission("denied");
    }
  }, []);

  /* ──────────────────────────────────────────────────────────
     2. Stop camera
     ────────────────────────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    setCameraActive(false);
    setLiveScanning(false);

    if (analyzeTimerRef.current) {
      clearTimeout(analyzeTimerRef.current);
      analyzeTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /* ──────────────────────────────────────────────────────────
     3. Grab a single frame as base64 JPEG
     ────────────────────────────────────────────────────────── */
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) return null;

    const canvas = canvasRef.current;
    canvas.width = vw;
    canvas.height = vh;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, vw, vh);
    return canvas.toDataURL("image/jpeg", 0.7); // slightly lower quality for speed
  }, []);

  /* ──────────────────────────────────────────────────────────
     4. Send one frame to Gemini and update results
     ────────────────────────────────────────────────────────── */
  const analyzeFrame = useCallback(async () => {
    if (!isMountedRef.current) return;

    const imageData = captureFrame();
    if (!imageData) return;

    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageData,
          answerKey: MOCK_ANSWER_KEY,
        }),
      });

      if (!isMountedRef.current) return;

      const data = await response.json();

      if (response.ok) {
        setResults(data.results ?? []);
        setSummary(data.summary ?? null);
        setNotes(data.notes ?? null);
        setScanCount((c) => c + 1);
        setError(null);
      }
      // silently ignore errors during live scanning to avoid flickering
    } catch {
      // network errors are silently ignored during live scanning
    } finally {
      if (isMountedRef.current) setIsAnalyzing(false);
    }
  }, [captureFrame]);

  /* ──────────────────────────────────────────────────────────
     5. Live scanning loop
     ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!liveScanning || !cameraActive) return;

    let cancelled = false;

    const loop = async () => {
      if (cancelled) return;
      await analyzeFrame();
      if (cancelled) return;
      // Wait 3 seconds between scans to avoid hammering the API
      analyzeTimerRef.current = setTimeout(loop, 3000);
    };

    // Start the first scan after a short delay so the camera has time to focus
    analyzeTimerRef.current = setTimeout(loop, 1000);

    return () => {
      cancelled = true;
      if (analyzeTimerRef.current) {
        clearTimeout(analyzeTimerRef.current);
        analyzeTimerRef.current = null;
      }
    };
  }, [liveScanning, cameraActive, analyzeFrame]);

  /* ──────────────────────────────────────────────────────────
     6. Bind video stream to <video> element
     ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (
      cameraPermission === "granted" &&
      videoRef.current &&
      streamRef.current
    ) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
      }
    }
  }, [cameraPermission, cameraActive]);

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <section
      className="rounded-3xl border border-dark-teal/10 bg-white/80 p-5 shadow-sm sm:p-8"
      aria-labelledby="scanner-heading"
    >
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="space-y-2">
          <h2
            id="scanner-heading"
            className="text-xl font-extrabold tracking-tight text-navy sm:text-2xl"
          >
            Live AI Paper Grader
          </h2>
          <p className="text-sm text-navy/65">
            Point your camera at an answer sheet. Gemini Vision AI will
            continuously detect and grade answers — green for correct, red for
            wrong.
          </p>
        </div>

        {/* ── Gemini status ── */}
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`h-2 w-2 rounded-full ${
              liveScanning ? "animate-pulse bg-green-500" : "bg-green-500"
            }`}
          />
          <span className="text-navy/70">
            {liveScanning
              ? `Scanning live… (${scanCount} scans)`
              : "Gemini Vision AI ready"}
          </span>
        </div>

        {/* ── Camera feed ── */}
        <div
          className={
            cameraActive
              ? "fixed inset-0 z-50 bg-black"
              : "relative w-full overflow-hidden rounded-2xl border border-dark-teal/10 bg-navy/5"
          }
        >
          {cameraPermission !== "granted" ? (
            <div className="flex h-80 flex-col items-center justify-center gap-4 bg-soft-teal/30 sm:h-96">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-sky-blue/20" />
                <Camera className="relative h-12 w-12 text-navy/40" />
              </div>
              <p className="text-sm font-medium text-navy/60">
                Camera access required to start scanning
              </p>
              <button
                type="button"
                onClick={requestCameraAccess}
                className="rounded-xl bg-sky-blue/10 px-4 py-2 text-xs font-semibold text-sky-blue transition hover:bg-sky-blue/20"
              >
                Grant Camera Access
              </button>
            </div>
          ) : (
            <>
              {/* Live video */}
              <video
                ref={videoRef}
                className={`block h-full w-full ${
                  cameraActive ? "object-cover" : ""
                }`}
                playsInline
                muted
                autoPlay
              />

              {/* Hidden canvas for frame capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* ── LIVE RESULTS OVERLAY ── */}
              {cameraActive && results.length > 0 && (
                <div className="absolute left-3 top-3 max-h-[60vh] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl bg-black/70 p-3 backdrop-blur-md">
                  {/* Score badge */}
                  {summary && (
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-white/80">
                        Score
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-extrabold ${
                          summary.score >= 80
                            ? "bg-green-500 text-white"
                            : summary.score >= 50
                            ? "bg-amber-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {summary.score}%
                      </span>
                    </div>
                  )}

                  {/* Per-question results */}
                  <div className="space-y-1.5">
                    {results
                      .filter((r) => r.detected)
                      .map((r) => (
                        <div
                          key={r.questionNumber}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold ${
                            r.isCorrect
                              ? "bg-green-500/30 text-green-300"
                              : "bg-red-500/30 text-red-300"
                          }`}
                        >
                          <span>
                            Q{r.questionNumber}: {r.detected}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-white/50">
                              ({r.expected})
                            </span>
                            {r.isCorrect ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <X className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Notes */}
                  {notes && (
                    <p className="mt-2 text-[11px] italic text-white/40">
                      {notes}
                    </p>
                  )}
                </div>
              )}

              {/* ── Top-right HUD ── */}
              {cameraActive && (
                <div className="absolute right-3 top-3 space-y-1 rounded-xl bg-black/60 px-3 py-2 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        liveScanning
                          ? "animate-pulse bg-green-400"
                          : "bg-white/40"
                      }`}
                    />
                    {liveScanning ? "SCANNING" : "LIVE"}
                  </div>
                  {isAnalyzing && (
                    <div className="flex items-center gap-1 text-[11px] text-sky-blue">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing…
                    </div>
                  )}
                </div>
              )}

              {/* ── Bottom controls bar ── */}
              {cameraActive && (
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-16">
                  {/* Cancel */}
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="touch-manipulation text-base font-bold text-white transition active:scale-95"
                  >
                    Cancel
                  </button>

                  {/* Start / Stop scanning */}
                  <button
                    type="button"
                    onClick={() => setLiveScanning((s) => !s)}
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-xl transition active:scale-95 ${
                      liveScanning
                        ? "bg-red-500 ring-4 ring-red-500/30"
                        : "bg-white ring-4 ring-white/30"
                    }`}
                    aria-label={
                      liveScanning ? "Stop scanning" : "Start scanning"
                    }
                  >
                    {liveScanning ? (
                      <StopCircle className="h-7 w-7 text-white" />
                    ) : (
                      <div className="h-[3.25rem] w-[3.25rem] rounded-full border-[3px] border-green-500" />
                    )}
                  </button>

                  {/* Spacer for centering */}
                  <div className="w-[66px]" aria-hidden />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Controls (shown when camera is off) ── */}
        {!cameraActive && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={requestCameraAccess}
              className="touch-manipulation inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-sky-blue px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-sky-blue/25 transition hover:bg-sky-blue/90 active:scale-[0.99] sm:px-8"
            >
              <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
              Start Camera
            </button>
          </div>
        )}

        {/* ── Answer key reference ── */}
        <div className="rounded-2xl border border-dark-teal/10 bg-soft-teal/20 p-4">
          <h3 className="text-sm font-bold text-navy">
            Answer Key (Mock)
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(MOCK_ANSWER_KEY).map(([q, a]) => (
              <span
                key={q}
                className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1 text-xs font-semibold text-navy"
              >
                {q.toUpperCase()}:{" "}
                <span className="text-sky-blue">{a}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Tips ── */}
        <div className="rounded-2xl border border-sky-blue/20 bg-sky-blue/5 p-4 text-sm text-navy/75">
          <p className="font-medium text-navy">How to use:</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>1. Tap &quot;Start Camera&quot; for fullscreen view</li>
            <li>2. Aim at the answer sheet</li>
            <li>
              3. Tap the green circle to start live scanning — results
              overlay in real time
            </li>
            <li>4. Green = correct, Red = wrong</li>
            <li>5. Tap the red stop button to pause scanning</li>
          </ul>
        </div>
      </div>
    </section>
  );
}