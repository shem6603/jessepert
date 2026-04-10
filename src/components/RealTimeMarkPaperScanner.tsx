"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  StopCircle,
  RefreshCw,
  Check,
  X,
  Loader2,
  Scan,
  ImageIcon,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────
   Answer key – in production this would come from props / backend
   ──────────────────────────────────────────────────────────── */

const MOCK_ANSWER_KEY: Record<string, string> = {
  q1: "a",
  q2: "b",
  q3: "c",
  q4: "d",
  q5: "a",
};

/* ── Interfaces ── */

interface GradedResult {
  questionId: string;
  questionNumber: number;
  expectedAnswer: string;
  detectedAnswer: string | null;
  isCorrect: boolean | null;
  confidence: number;
}

interface ScanSummary {
  totalDetected: number;
  totalGraded: number;
  correctCount: number;
  incorrectCount: number;
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

  /* ── state ── */
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<
    "pending" | "granted" | "denied"
  >("pending");
  const [error, setError] = useState<string | null>(null);

  // Capture & analysis
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Results
  const [results, setResults] = useState<GradedResult[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [notes, setNotes] = useState<string | null>(null);

  /* ──────────────────────────────────────────────────────────
     1. Request camera access (rear-facing preferred)
     ────────────────────────────────────────────────────────── */
  const requestCameraAccess = useCallback(async () => {
    try {
      setCameraPermission("pending");
      setError(null);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {
            setError("Failed to start video playback.");
          });
        };
      }

      setCameraPermission("granted");
      setCameraActive(true);
    } catch (err) {
      const errorMsg =
        err instanceof DOMException ? err.message : "Unknown camera error";
      setError(`Camera access denied: ${errorMsg}`);
      setCameraPermission("denied");
    }
  }, []);

  /* ──────────────────────────────────────────────────────────
     2. Stop camera
     ────────────────────────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    setCameraActive(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /* ──────────────────────────────────────────────────────────
     3. Capture frame from video
     ────────────────────────────────────────────────────────── */
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (vw === 0 || vh === 0) return null;

    canvas.width = vw;
    canvas.height = vh;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, vw, vh);

    // Convert to JPEG base64
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  /* ──────────────────────────────────────────────────────────
     4. Capture & Analyze with Gemini Vision
     ────────────────────────────────────────────────────────── */
  const handleCaptureAndAnalyze = useCallback(async () => {
    setError(null);

    // Capture frame
    const imageData = captureFrame();
    if (!imageData) {
      setError("Failed to capture frame. Make sure camera is active.");
      return;
    }

    setCapturedImage(imageData);
    setIsAnalyzing(true);
    setResults([]);
    setSummary(null);
    setNotes(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageData,
          answerKey: MOCK_ANSWER_KEY,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Analysis failed. Please try again.");
        return;
      }

      setResults(data.results ?? []);
      setSummary(data.summary ?? null);
      setNotes(data.notes ?? null);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Network error. Make sure the server is running.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [captureFrame]);

  /* ──────────────────────────────────────────────────────────
     5. Reset everything
     ────────────────────────────────────────────────────────── */
  const handleReset = useCallback(() => {
    setCapturedImage(null);
    setResults([]);
    setSummary(null);
    setNotes(null);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <section
      className="rounded-3xl border border-dark-teal/10 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-8"
      aria-labelledby="scanner-heading"
    >
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="space-y-2">
          <h2
            id="scanner-heading"
            className="text-xl font-extrabold tracking-tight text-navy sm:text-2xl"
          >
            AI-Powered Mark Paper Scanner
          </h2>
          <p className="text-sm text-navy/65">
            Point your camera at a multiple-choice answer sheet, capture a
            photo, and let Gemini Vision AI detect and grade the answers
            instantly.
          </p>
        </div>

        {/* ── Gemini status ── */}
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-navy/70">Gemini Vision AI ready</span>
        </div>

        {/* ── Camera feed / Captured image ── */}
        <div className="relative w-full overflow-hidden rounded-2xl border border-dark-teal/10 bg-navy/5">
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
              {/* Live video feed */}
              <video
                ref={videoRef}
                className={`block w-full ${capturedImage ? "hidden" : ""}`}
                playsInline
                muted
                autoPlay
              />

              {/* Hidden canvas for frame capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Captured image preview */}
              {capturedImage && (
                <div className="relative">
                  <img
                    src={capturedImage}
                    alt="Captured answer sheet"
                    className="block w-full"
                  />

                  {/* Analysing overlay */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-3 rounded-2xl bg-black/60 px-6 py-5 backdrop-blur-md">
                        <Loader2 className="h-8 w-8 animate-spin text-sky-blue" />
                        <p className="text-sm font-semibold text-white">
                          Gemini Vision is analyzing…
                        </p>
                        <p className="text-xs text-white/60">
                          Detecting bubbles and grading answers
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Live HUD when camera is active and no capture */}
              {cameraActive && !capturedImage && (
                <div className="absolute right-3 top-3 space-y-1 rounded-xl bg-black/60 px-3 py-2 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                    LIVE
                  </div>
                  <div className="text-xs text-white/80">
                    Aim at answer sheet
                  </div>
                </div>
              )}

              {/* Prompt when camera is ready but not yet captured */}
              {!cameraActive && cameraPermission === "granted" && !capturedImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <p className="rounded-xl bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                    Press &quot;Start Camera&quot; to begin
                  </p>
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

        {/* ── Controls ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Start / Stop camera */}
          {!cameraActive ? (
            <button
              type="button"
              onClick={requestCameraAccess}
              className="touch-manipulation inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-sky-blue px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-sky-blue/25 transition hover:bg-sky-blue/90 active:scale-[0.99] sm:px-8"
            >
              <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
              Start Camera
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="touch-manipulation inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-red-500 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-600 active:scale-[0.99] sm:px-8"
            >
              <StopCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              Stop Camera
            </button>
          )}

          {/* Capture & Analyse */}
          <button
            type="button"
            onClick={handleCaptureAndAnalyze}
            disabled={!cameraActive || isAnalyzing}
            className={`touch-manipulation inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-extrabold transition sm:px-8 ${
              cameraActive && !isAnalyzing
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 active:scale-[0.99]"
                : "cursor-not-allowed bg-navy/10 text-navy/40"
            }`}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
            ) : (
              <Scan className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
            {isAnalyzing ? "Analyzing…" : "Capture & Analyze"}
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="touch-manipulation inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border-2 border-dark-teal/30 bg-transparent px-6 py-2.5 text-sm font-extrabold text-dark-teal transition hover:bg-dark-teal/5 active:scale-95 sm:px-8"
          >
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
            Reset
          </button>
        </div>

        {/* ── Results summary ── */}
        {summary && (
          <div className="space-y-4 rounded-2xl border border-dark-teal/10 bg-soft-teal/30 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-navy">
                Scan Results
              </h3>
              {summary.score > 0 && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    summary.score >= 80
                      ? "bg-green-100 text-green-700"
                      : summary.score >= 50
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {summary.score}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white/70 p-3">
                <p className="text-xs text-navy/60">Total Detected</p>
                <p className="text-lg font-bold text-navy">
                  {summary.totalDetected}
                </p>
              </div>

              <div className="rounded-xl bg-white/70 p-3">
                <p className="text-xs text-navy/60">Graded</p>
                <p className="text-lg font-bold text-navy">
                  {summary.totalGraded}
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-3">
                <p className="text-xs text-green-700">Correct</p>
                <p className="text-lg font-bold text-green-600">
                  {summary.correctCount}
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-3">
                <p className="text-xs text-red-700">Incorrect</p>
                <p className="text-lg font-bold text-red-600">
                  {summary.incorrectCount}
                </p>
              </div>
            </div>

            {/* Per-question breakdown */}
            <div className="space-y-2">
              {results
                .filter((r) => r.detectedAnswer)
                .map((result) => (
                  <div
                    key={result.questionId}
                    className="flex items-center justify-between rounded-lg bg-white/60 p-2.5 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-navy">
                        Q{result.questionNumber}{" "}
                        <span className="text-sky-blue">
                          {result.detectedAnswer?.toUpperCase()}
                        </span>
                        {result.confidence < 1 && (
                          <span className="ml-2 text-xs text-navy/40">
                            {Math.round(result.confidence * 100)}% conf
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-navy/60">
                        Expected: {result.expectedAnswer?.toUpperCase()}
                      </p>
                    </div>
                    {result.isCorrect === true ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                        <X className="h-4 w-4 text-red-600" />
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* AI notes */}
            {notes && (
              <div className="rounded-lg bg-sky-blue/5 p-3 text-xs text-navy/70">
                <span className="font-semibold text-navy">AI Notes:</span>{" "}
                {notes}
              </div>
            )}
          </div>
        )}

        {/* ── Answer key reference ── */}
        <div className="rounded-2xl border border-dark-teal/10 bg-soft-teal/20 p-4">
          <h3 className="text-sm font-bold text-navy">
            Current Answer Key (Mock)
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(MOCK_ANSWER_KEY).map(([q, a]) => (
              <span
                key={q}
                className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1 text-xs font-semibold text-navy"
              >
                {q.toUpperCase()}:{" "}
                <span className="text-sky-blue">{a.toUpperCase()}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Tips ── */}
        <div className="rounded-2xl border border-sky-blue/20 bg-sky-blue/5 p-4 text-sm text-navy/75">
          <p className="font-medium text-navy">Tips for best results:</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• Keep the paper flat and well-lit</li>
            <li>• Position the camera perpendicular to the page</li>
            <li>• Ensure all bubbles are clearly visible</li>
            <li>• Avoid shadows and glare on the page</li>
            <li>• Hold steady before pressing &quot;Capture &amp; Analyze&quot;</li>
          </ul>
        </div>
      </div>
    </section>
  );
}