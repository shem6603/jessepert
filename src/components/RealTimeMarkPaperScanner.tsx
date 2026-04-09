"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, StopCircle, RefreshCw, Check, X, Loader2 } from "lucide-react";

/* ────────────────────────────────────────────────────────────
   Type declarations for the globally-loaded OpenCV.js
   ──────────────────────────────────────────────────────────── */
declare global {
  interface Window {
    cv: any;
    Module: any;
  }
}

/**
 * Mock answer key for OMR scanning.
 * In production this would come from the backend or as a prop.
 */
const MOCK_ANSWER_KEY: Record<string, string> = {
  q1: "a",
  q2: "b",
  q3: "c",
  q4: "d",
  q5: "a",
};

/**
 * Tuning knobs for bubble detection.
 */
const OMR_CONFIG = {
  minBubbleArea: 50,
  maxBubbleArea: 5000,
  fillThreshold: 0.4,
  bubbleRowGap: 20,
  bubbleColGap: 15,
};

/* ────── Interfaces ────── */

interface BubbleResult {
  id: string;
  expectedAnswer: string;
  detectedAnswer: string | null;
  isCorrect: boolean | null;
  bounds: { x: number; y: number; width: number; height: number };
}

interface ScannerStats {
  fps: number;
  bubblesDetected: number;
  correctAnswers: number;
  totalAnswers: number;
}

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */

export function RealTimeMarkPaperScanner() {
  /* ── refs ── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  /* ── state ── */
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<
    "pending" | "granted" | "denied"
  >("pending");
  const [error, setError] = useState<string | null>(null);
  const [bubbleResults, setBubbleResults] = useState<BubbleResult[]>([]);
  const [stats, setStats] = useState<ScannerStats>({
    fps: 0,
    bubblesDetected: 0,
    correctAnswers: 0,
    totalAnswers: 0,
  });
  const [openCVLoaded, setOpenCVLoaded] = useState(false);
  const [openCVLoading, setOpenCVLoading] = useState(true);

  /* ──────────────────────────────────────────────────────────
     1. Load OpenCV.js dynamically (WASM runtime)
     ────────────────────────────────────────────────────────── */
  useEffect(() => {
    // If OpenCV is already loaded (e.g. HMR), skip.
    if (window.cv && window.cv.Mat) {
      setOpenCVLoaded(true);
      setOpenCVLoading(false);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://docs.opencv.org/4.7.0/opencv.js";
    script.async = true;

    // OpenCV.js invokes Module.onRuntimeInitialized when WASM is ready.
    window.Module = {
      onRuntimeInitialized: () => {
        setOpenCVLoaded(true);
        setOpenCVLoading(false);
      },
    };

    script.onerror = () => {
      setError(
        "Failed to load OpenCV.js. Computer vision features are unavailable."
      );
      setOpenCVLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  /* ──────────────────────────────────────────────────────────
     2. Request camera access (rear-facing preferred)
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
    } catch (err) {
      const errorMsg =
        err instanceof DOMException ? err.message : "Unknown camera error";
      setError(`Camera access denied: ${errorMsg}`);
      setCameraPermission("denied");
    }
  }, []);

  /* ──────────────────────────────────────────────────────────
     3. Stop / Cleanup
     ────────────────────────────────────────────────────────── */
  const stopScanning = useCallback(() => {
    isRunningRef.current = false;
    setIsScanning(false);

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Clear the overlay canvas
    if (displayCanvasRef.current) {
      const ctx = displayCanvasRef.current.getContext("2d");
      ctx?.clearRect(
        0,
        0,
        displayCanvasRef.current.width,
        displayCanvasRef.current.height
      );
    }
  }, []);

  /* ──────────────────────────────────────────────────────────
     4. Helper: check if a contour is filled
     ────────────────────────────────────────────────────────── */
  const isContourFilled = useCallback(
    (contour: any, mask: any, fillThreshold: number): boolean => {
      const cv = window.cv;
      const area = cv.contourArea(contour);
      const rect = cv.boundingRect(contour);

      if (area === 0 || rect.width === 0 || rect.height === 0) return false;

      // Clamp roi to image bounds
      const clampedX = Math.max(0, rect.x);
      const clampedY = Math.max(0, rect.y);
      const clampedW = Math.min(rect.width, mask.cols - clampedX);
      const clampedH = Math.min(rect.height, mask.rows - clampedY);

      if (clampedW <= 0 || clampedH <= 0) return false;

      const roiRect = new cv.Rect(clampedX, clampedY, clampedW, clampedH);
      const roiMask = mask.roi(roiRect);
      const nonZero = cv.countNonZero(roiMask);
      const fillPercentage = nonZero / (clampedW * clampedH);

      roiMask.delete();
      return fillPercentage >= fillThreshold;
    },
    []
  );

  /* ──────────────────────────────────────────────────────────
     5. Process a single frame for OMR detection
     ────────────────────────────────────────────────────────── */
  const processFrame = useCallback((): BubbleResult[] => {
    if (
      !videoRef.current ||
      !processingCanvasRef.current ||
      !window.cv ||
      !window.cv.Mat
    )
      return [];

    const cv = window.cv;

    try {
      const ctx = processingCanvasRef.current.getContext("2d");
      if (!ctx) return [];

      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      if (vw === 0 || vh === 0) return [];

      processingCanvasRef.current.width = vw;
      processingCanvasRef.current.height = vh;

      // Draw video frame to the hidden processing canvas
      ctx.drawImage(videoRef.current, 0, 0, vw, vh);

      const imageData = ctx.getImageData(0, 0, vw, vh);
      const src = cv.matFromImageData(imageData);
      const gray = new cv.Mat();
      const binary = new cv.Mat();

      // Convert to grayscale
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // Apply Gaussian blur to reduce noise
      const kSize = new cv.Size(5, 5);
      cv.GaussianBlur(gray, gray, kSize, 0);

      // Binary threshold (invert so bubbles are white)
      cv.threshold(gray, binary, 127, 255, cv.THRESH_BINARY_INV);

      // Find contours
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(
        binary,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      const results: BubbleResult[] = [];
      const answerLabels = ["a", "b", "c", "d"];

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);

        if (area < OMR_CONFIG.minBubbleArea || area > OMR_CONFIG.maxBubbleArea) {
          contour.delete();
          continue;
        }

        const rect = cv.boundingRect(contour);
        const aspectRatio = rect.width / rect.height;

        // Roughly circular / square contours only
        if (aspectRatio < 0.7 || aspectRatio > 1.3) {
          contour.delete();
          continue;
        }

        const isFilled = isContourFilled(contour, binary, OMR_CONFIG.fillThreshold);

        // Map pixel position → question/answer indices
        const rowIndex = Math.floor(
          rect.y / (rect.height + OMR_CONFIG.bubbleRowGap)
        );
        const colIndex = Math.floor(
          rect.x / (rect.width + OMR_CONFIG.bubbleColGap)
        );

        const questionId = `q${rowIndex + 1}`;
        const detectedAnswer = answerLabels[colIndex] ?? null;
        const expectedAnswer = MOCK_ANSWER_KEY[questionId] ?? null;

        if (detectedAnswer && expectedAnswer) {
          const isCorrect = isFilled
            ? detectedAnswer === expectedAnswer
            : null;

          results.push({
            id: `${questionId}-${detectedAnswer}`,
            expectedAnswer,
            detectedAnswer: isFilled ? detectedAnswer : null,
            isCorrect: isFilled ? isCorrect : null,
            bounds: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            },
          });
        }

        contour.delete();
      }

      // Cleanup OpenCV mats
      contours.delete();
      hierarchy.delete();
      src.delete();
      gray.delete();
      binary.delete();

      return results;
    } catch (err) {
      console.error("Frame processing error:", err);
      return [];
    }
  }, [isContourFilled]);

  /* ──────────────────────────────────────────────────────────
     6. Draw AR overlays on the visible canvas
     ────────────────────────────────────────────────────────── */
  const drawOverlays = useCallback((results: BubbleResult[]) => {
    if (!displayCanvasRef.current || !videoRef.current) return;

    const ctx = displayCanvasRef.current.getContext("2d");
    if (!ctx) return;

    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;

    displayCanvasRef.current.width = vw;
    displayCanvasRef.current.height = vh;

    ctx.clearRect(0, 0, vw, vh);

    // Draw a subtle scan-line animation
    const time = Date.now() / 1000;
    const scanLineY = ((time * 80) % vh);
    const gradient = ctx.createLinearGradient(0, scanLineY - 30, 0, scanLineY + 30);
    gradient.addColorStop(0, "rgba(14, 165, 233, 0)");
    gradient.addColorStop(0.5, "rgba(14, 165, 233, 0.15)");
    gradient.addColorStop(1, "rgba(14, 165, 233, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, scanLineY - 30, vw, 60);

    results.forEach((result) => {
      const { bounds, isCorrect } = result;

      // Pick color
      const strokeColor =
        isCorrect === true
          ? "#22c55e"
          : isCorrect === false
          ? "#ef4444"
          : "#64748b";

      const fillColor =
        isCorrect === true
          ? "rgba(34, 197, 94, 0.18)"
          : isCorrect === false
          ? "rgba(239, 68, 68, 0.18)"
          : "rgba(100, 114, 139, 0.10)";

      // Bounding box
      ctx.fillStyle = fillColor;
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

      // Corner accents for visual polish
      const cornerLen = Math.min(bounds.width, bounds.height) * 0.25;
      ctx.lineWidth = 4;
      ctx.strokeStyle = strokeColor;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(bounds.x, bounds.y + cornerLen);
      ctx.lineTo(bounds.x, bounds.y);
      ctx.lineTo(bounds.x + cornerLen, bounds.y);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(bounds.x + bounds.width - cornerLen, bounds.y);
      ctx.lineTo(bounds.x + bounds.width, bounds.y);
      ctx.lineTo(bounds.x + bounds.width, bounds.y + cornerLen);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(bounds.x, bounds.y + bounds.height - cornerLen);
      ctx.lineTo(bounds.x, bounds.y + bounds.height);
      ctx.lineTo(bounds.x + cornerLen, bounds.y + bounds.height);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(
        bounds.x + bounds.width - cornerLen,
        bounds.y + bounds.height
      );
      ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height);
      ctx.lineTo(
        bounds.x + bounds.width,
        bounds.y + bounds.height - cornerLen
      );
      ctx.stroke();

      // Check / X icon in the center
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const iconSize = Math.min(bounds.width, bounds.height) * 0.5;

      ctx.fillStyle = strokeColor;
      ctx.font = `bold ${iconSize}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (isCorrect === true) {
        ctx.fillText("✓", centerX, centerY);
      } else if (isCorrect === false) {
        ctx.fillText("✕", centerX, centerY);
      }
    });
  }, []);

  /* ──────────────────────────────────────────────────────────
     7. Main rAF processing loop
     ────────────────────────────────────────────────────────── */
  const startScanningLoop = useCallback(() => {
    const loop = () => {
      if (!isRunningRef.current || !videoRef.current) return;

      const frameStart = performance.now();

      // Process frame
      const results = processFrame();

      // Update stats
      const correctCount = results.filter((r) => r.isCorrect === true).length;
      const totalCount = results.filter((r) => r.isCorrect !== null).length;

      setStats({
        fps: Math.round(1000 / (performance.now() - frameStart)),
        bubblesDetected: results.length,
        correctAnswers: correctCount,
        totalAnswers: totalCount,
      });

      // Draw overlays
      drawOverlays(results);

      // Update results
      setBubbleResults(results);

      // Schedule next frame
      rafIdRef.current = requestAnimationFrame(() => {
        if (isRunningRef.current) {
          loop();
        }
      });
    };

    loop();
  }, [processFrame, drawOverlays]);

  /* ──────────────────────────────────────────────────────────
     8. Start scanner
     ────────────────────────────────────────────────────────── */
  const handleStartScanner = useCallback(async () => {
    if (!openCVLoaded) {
      setError("OpenCV.js is still loading. Please wait…");
      return;
    }

    if (cameraPermission !== "granted") {
      await requestCameraAccess();
    }

    // Wait for the video element to be ready
    const waitForVideo = () =>
      new Promise<void>((resolve) => {
        const check = () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      });

    // If camera was just granted, need to wait for stream
    if (!streamRef.current) {
      await requestCameraAccess();
    }
    await waitForVideo();

    isRunningRef.current = true;
    setIsScanning(true);
    setError(null);

    // Start the processing loop
    rafIdRef.current = requestAnimationFrame(() => startScanningLoop());
  }, [openCVLoaded, cameraPermission, requestCameraAccess, startScanningLoop]);

  /* ──────────────────────────────────────────────────────────
     9. Reset
     ────────────────────────────────────────────────────────── */
  const handleReset = useCallback(() => {
    stopScanning();
    setBubbleResults([]);
    setStats({ fps: 0, bubblesDetected: 0, correctAnswers: 0, totalAnswers: 0 });
  }, [stopScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      stopScanning();
    };
  }, [stopScanning]);

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
            Real-Time Mark Paper Scanner
          </h2>
          <p className="text-sm text-navy/65">
            Point your camera at a multiple-choice answer sheet. The scanner
            will detect bubbles in real-time and compare them against the
            answer key.
          </p>
        </div>

        {/* ── OpenCV status ── */}
        <div className="flex items-center gap-2 text-sm">
          {openCVLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-sky-blue" />
              <span className="text-navy/70">Loading computer vision engine…</span>
            </>
          ) : openCVLoaded ? (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-navy/70">Computer vision ready</span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-red-600">Computer vision failed to load</span>
            </>
          )}
        </div>

        {/* ── Camera feed container ── */}
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
              {/* Base video element */}
              <video
                ref={videoRef}
                className="block w-full"
                playsInline
                muted
                autoPlay
              />

              {/* Hidden processing canvas */}
              <canvas ref={processingCanvasRef} className="hidden" />

              {/* AR overlay canvas */}
              <canvas
                ref={displayCanvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />

              {/* Live stats HUD */}
              {isScanning && (
                <div className="absolute right-3 top-3 space-y-1 rounded-xl bg-black/60 px-3 py-2 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                    LIVE
                  </div>
                  <div className="text-xs text-white/80">
                    FPS: {stats.fps}
                  </div>
                  <div className="text-xs text-white/80">
                    Bubbles: {stats.bubblesDetected}
                  </div>
                  {stats.totalAnswers > 0 && (
                    <div className="text-xs text-white/80">
                      Score: {stats.correctAnswers}/{stats.totalAnswers}
                    </div>
                  )}
                </div>
              )}

              {/* Scanning indicator when not scanning yet */}
              {!isScanning && cameraPermission === "granted" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <p className="rounded-xl bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                    Press &quot;Start Scanner&quot; to begin real-time detection
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
          {!isScanning ? (
            <button
              type="button"
              onClick={handleStartScanner}
              disabled={!openCVLoaded}
              className={`touch-manipulation inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-extrabold transition sm:px-8 ${
                openCVLoaded
                  ? "bg-sky-blue text-white shadow-lg shadow-sky-blue/25 hover:bg-sky-blue/90 active:scale-[0.99]"
                  : "cursor-not-allowed bg-navy/10 text-navy/40"
              }`}
            >
              <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
              Start Scanner
            </button>
          ) : (
            <button
              type="button"
              onClick={stopScanning}
              className="touch-manipulation inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-red-500 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-600 active:scale-[0.99] sm:px-8"
            >
              <StopCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              Stop Scanner
            </button>
          )}

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
        {bubbleResults.length > 0 && (
          <div className="space-y-4 rounded-2xl border border-dark-teal/10 bg-soft-teal/30 p-4">
            <h3 className="text-sm font-extrabold text-navy">Scan Results</h3>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-white/70 p-3">
                <p className="text-xs text-navy/60">Total Bubbles</p>
                <p className="text-lg font-bold text-navy">
                  {bubbleResults.length}
                </p>
              </div>

              <div className="rounded-xl bg-white/70 p-3">
                <p className="text-xs text-navy/60">Detected Answers</p>
                <p className="text-lg font-bold text-navy">
                  {bubbleResults.filter((r) => r.detectedAnswer).length}
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-3">
                <p className="text-xs text-green-700">Correct</p>
                <p className="text-lg font-bold text-green-600">
                  {stats.correctAnswers}
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-3">
                <p className="text-xs text-red-700">Incorrect</p>
                <p className="text-lg font-bold text-red-600">
                  {stats.totalAnswers - stats.correctAnswers}
                </p>
              </div>
            </div>

            {/* Per-question breakdown */}
            <div className="space-y-2">
              {bubbleResults
                .filter((r) => r.detectedAnswer)
                .map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between rounded-lg bg-white/60 p-2.5 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-navy">
                        {result.id.split("-")[0].toUpperCase()}{" "}
                        <span className="text-sky-blue">
                          {result.detectedAnswer?.toUpperCase()}
                        </span>
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
            <li>• Use a standard OMR bubble sheet for best detection</li>
          </ul>
        </div>
      </div>
    </section>
  );
}