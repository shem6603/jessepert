"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  StopCircle,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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
  const [notes, setNotes] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);

  const summary = results.length > 0 ? {
    totalDetected: results.length,
    totalGraded: results.length,
    correct: results.filter((r) => r.isCorrect).length,
    incorrect: results.filter((r) => !r.isCorrect).length,
    score: Math.round((results.filter((r) => r.isCorrect).length / results.length) * 100),
  } : null;
  
  const [studentName, setStudentName] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
        }),
      });

      if (!isMountedRef.current) return;

      const data = await response.json();

      if (response.ok) {
        if (data.studentName) setStudentName((prev) => prev || data.studentName);
        if (data.subject) setSubject((prev) => prev || data.subject);
        
        setResults((prevResults) => {
          const merged = [...prevResults];
          const incoming: GradedQuestion[] = data.results ?? [];
          incoming.forEach((inc) => {
            const idx = merged.findIndex((r) => r.questionNumber === inc.questionNumber);
            if (idx >= 0) {
              merged[idx] = inc;
            } else {
              merged.push(inc);
            }
          });
          return merged.sort((a, b) => a.questionNumber - b.questionNumber);
        });
        
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

  /* ──────────────────────────────────────────────────────────
     7. Save to Database
     ────────────────────────────────────────────────────────── */
  const handleSaveToDb = async () => {
    if (!summary || results.length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      await addDoc(collection(db, "scans"), {
        studentName,
        subject,
        summary,
        results,
        createdAt: serverTimestamp(),
      });
      setSaveSuccess(true);
    } catch (err) {
      console.error("Failed to save to db:", err);
      setError("Failed to save result to database.");
    } finally {
      setIsSaving(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <section
      className="max-w-5xl mx-auto rounded-3xl border border-outline-variant/30 w-full bg-surface-container-lowest p-5 shadow-sm sm:p-8 mt-4"
      aria-labelledby="scanner-heading"
    >
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="space-y-2">
          <h2
            id="scanner-heading"
            className="text-xl font-headline font-extrabold tracking-tight text-on-surface sm:text-3xl"
          >
            Live AI Paper Grader
          </h2>
          <p className="text-sm text-on-surface-variant">
            Point your camera at an answer sheet. Gemini Vision AI will
            continuously detect and grade answers — green for correct, red for
            wrong.
          </p>
        </div>

        {/* ── Gemini status ── */}
        <div className="flex items-center gap-2 text-sm font-bold">
          <div
            className={`h-2 w-2 rounded-full ${
              liveScanning ? "animate-pulse bg-primary" : "bg-primary"
            }`}
          />
          <span className="text-on-surface-variant">
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
              : "relative w-full overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-high"
          }
        >
          {cameraPermission !== "granted" ? (
            <div className="flex h-80 flex-col items-center justify-center gap-4 bg-surface-container sm:h-96">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <Camera className="relative h-12 w-12 text-on-surface-variant/50" />
              </div>
              <p className="text-sm font-bold text-on-surface-variant">
                Camera access required to start scanning
              </p>
              <button
                type="button"
                onClick={requestCameraAccess}
                className="rounded-xl bg-primary/20 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary/30"
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
                <div className="absolute left-3 top-3 bottom-28 w-48 flex flex-col gap-2 overflow-y-auto rounded-2xl bg-black/60 p-2 backdrop-blur-xl hide-scrollbar border border-white/10">
                  
                  {/* Student & Subject info */}
                  {(studentName || subject) && (
                    <div className="rounded-lg bg-surface-container-highest p-1.5 text-[10px] text-on-surface">
                      {studentName && <div className="truncate"><span className="opacity-60">Name:</span> <span className="font-bold">{studentName}</span></div>}
                      {subject && <div className="truncate"><span className="opacity-60">Subj:</span> <span className="font-bold">{subject}</span></div>}
                    </div>
                  )}

                  {/* Score badge */}
                  {summary && (
                    <div className="mb-1 flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-white/80">
                        Score
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
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
                  <div className="space-y-1">
                    {results
                      .filter((r) => r.detected)
                      .map((r) => (
                        <div
                          key={r.questionNumber}
                          className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold ${
                            r.isCorrect
                              ? "bg-green-500/30 text-green-300"
                              : "bg-red-500/30 text-red-300"
                          }`}
                        >
                          <span className="truncate">
                            Q{r.questionNumber}: {r.detected}
                          </span>
                          <div className="ml-1 flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-white/50">
                              ({r.expected})
                            </span>
                            {r.isCorrect ? (
                              <Check className="h-3 w-3 text-green-400" />
                            ) : (
                              <X className="h-3 w-3 text-red-400" />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Notes */}
                  {notes && (
                    <p className="mt-1 px-1 text-[10px] italic text-white/40 leading-tight">
                      {notes}
                    </p>
                  )}

                  {/* Spacer to push button to bottom if we want, or naturally flow */}
                  <div className="flex-1" />

                  {/* Save to Database Button */}
                  {!liveScanning && (
                    <button
                      onClick={handleSaveToDb}
                      disabled={isSaving || saveSuccess}
                      className={`mt-1 w-full rounded-lg py-2 text-xs font-bold transition ${
                        saveSuccess
                          ? "bg-primary text-on-primary"
                          : isSaving
                          ? "bg-surface-variant cursor-not-allowed text-on-surface-variant"
                          : "bg-primary text-on-primary hover:bg-primary-container"
                      }`}
                    >
                      {saveSuccess ? "Saved Successfully!" : isSaving ? "Saving..." : "Save to Database"}
                    </button>
                  )}
                </div>
              )}

              {/* ── Top-right HUD ── */}
              {cameraActive && (
                <div className="absolute right-3 top-3 space-y-1 rounded-xl bg-black/60 px-3 py-2 backdrop-blur-md border border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        liveScanning
                          ? "animate-pulse bg-primary"
                          : "bg-white/40"
                      }`}
                    />
                    {liveScanning ? "SCANNING" : "LIVE"}
                  </div>
                  {isAnalyzing && (
                    <div className="flex items-center gap-1 text-[11px] text-primary">
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
                    className="touch-manipulation text-base font-bold text-white transition active:scale-95 bg-black/40 hover:bg-black/80 px-6 py-2 rounded-full border border-white/20 backdrop-blur-sm"
                  >
                    Cancel
                  </button>

                  {/* Start / Stop scanning */}
                  <button
                    type="button"
                    onClick={() => {
                      setLiveScanning((s) => {
                        const newS = !s;
                        if (newS) setSaveSuccess(false);
                        return newS;
                      });
                    }}
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-xl transition active:scale-95 ${
                      liveScanning
                        ? "bg-red-500"
                        : "bg-surface"
                    }`}
                    aria-label={
                      liveScanning ? "Stop scanning" : "Start scanning"
                    }
                  >
                    {liveScanning ? (
                      <StopCircle className="h-7 w-7 text-white" />
                    ) : (
                      <div className="h-[3.25rem] w-[3.25rem] rounded-full border-[3px] border-primary" />
                    )}
                  </button>

                  {/* Spacer for centering */}
                  <div className="w-[88px]" aria-hidden />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl border border-error/50 bg-error-container p-3 text-sm font-bold text-on-error-container">
            {error}
          </div>
        )}

        {/* ── Controls (shown when camera is off) ── */}
        {!cameraActive && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={requestCameraAccess}
              className="touch-manipulation inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-extrabold text-on-primary shadow-[0_0_20px_rgba(184,253,75,0.15)] transition hover:scale-[1.02] active:scale-[0.99]"
            >
              <Camera className="h-5 w-5" />
              Start Camera
            </button>
          </div>
        )}

        {/* ── Tips ── */}
        {!cameraActive && (
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container p-4 text-sm text-on-surface-variant">
            <p className="font-bold text-on-surface">How to use:</p>
            <ul className="mt-2 space-y-2 text-xs font-medium">
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
        )}
      </div>
    </section>
  );
}