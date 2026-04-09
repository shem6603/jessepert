"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, StopCircle, RefreshCw, Check, X } from "lucide-react";

/**
 * Mock answer key for OMR scanning
 * In production, this would be fetched from your backend or passed as a prop
 */
const MOCK_ANSWER_KEY = {
  q1: "a", // Question 1: Answer A
  q2: "b", // Question 2: Answer B
  q3: "c", // Question 3: Answer C
  q4: "d", // Question 4: Answer D
  q5: "a", // Question 5: Answer A
} as const;

/**
 * Configuration for bubble detection
 */
const OMR_CONFIG = {
  minBubbleArea: 50, // Minimum contour area to be considered a bubble
  maxBubbleArea: 5000, // Maximum contour area
  fillThreshold: 0.4, // Minimum fill percentage to mark as "selected"
  bubbleRowGap: 20, // Pixel gap between question rows
  bubbleColGap: 15, // Pixel gap between option columns
};

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

declare global {
  interface Window {
    cv: any;
  }
}

export function RealTimeMarkPaperScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

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

  /**
   * Load OpenCV.js dynamically
   */
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/opencv.js/4.5.2/opencv.min.js";
    script.async = true;
    script.onload = () => {
      // @ts-ignore - OpenCV.js is loaded globally
      if (window.cv) {
        setOpenCVLoaded(true);
      }
    };
    script.onerror = () => {
      setError("Failed to load OpenCV.js. Computer vision features unavailable.");
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  /**
   * Request camera access
   */
  const requestCameraAccess = useCallback(async () => {
    try {
      setCameraPermission("pending");
      setError(null);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment", // Request rear camera
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
        err instanceof DOMException ? err.message : "Unknown error";
      setError(`Camera access denied: ${errorMsg}`);
      setCameraPermission("denied");
    }
  }, []);

  /**
   * Stop camera stream and cleanup
   */
  const stopScanning = useCallback(() => {
    isRunningRef.current = false;
    setIsScanning(false);

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Detect if a contour is filled (answer selected)
   */
  const isContourFilled = (
    contour: any,
    mask: any,
    fillThreshold: number
  ): boolean => {
    const area = window.cv.contourArea(contour);
    const rect = window.cv.boundingRect(contour);

    if (area === 0) return false;

    const roiMask = mask.roi(
      new window.cv.Rect(rect.x, rect.y, rect.width, rect.height)
    );
    const nonZero = window.cv.countNonZero(roiMask);
    const fillPercentage = nonZero / (rect.width * rect.height);

    roiMask.delete();
    return fillPercentage >= fillThreshold;
  };

  /**
   * Process a single frame for OMR detection
   */
  const processFrame = useCallback((): BubbleResult[] => {
    if (!videoRef.current || !processingCanvasRef.current) return [];

    try {
      const ctx = processingCanvasRef.current.getContext("2d");
      if (!ctx) return [];

      processingCanvasRef.current.width = videoRef.current.videoWidth;
      processingCanvasRef.current.height = videoRef.current.videoHeight;

      // Draw video frame to processing canvas
      ctx.drawImage(
        videoRef.current,
        0,
        0,
        processingCanvasRef.current.width,
        processingCanvasRef.current.height
      );

      const imageData = ctx.getImageData(
        0,
        0,
        processingCanvasRef.current.width,
        processingCanvasRef.current.height
      );

      const src = window.cv.matFromImageData(imageData);
      const gray = window.cv.Mat.zeros(src.rows, src.cols, window.cv.CV_8U);
      const binary = window.cv.Mat.zeros(src.rows, src.cols, window.cv.CV_8U);

      // Convert to grayscale
      window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);

      // Apply binary threshold
      window.cv.threshold(
        gray,
        binary,
        127,
        255,
        window.cv.THRESH_BINARY_INV
      );

      // Find contours
      const contours = new window.cv.MatVector();
      const hierarchy = window.cv.Mat.zeros(src.rows, 1, window.cv.CV_32S);
      window.cv.findContours(binary, contours, hierarchy, window.cv.RETR_TREE, window.cv.CHAIN_APPROX_SIMPLE);

      const results: BubbleResult[] = [];

      // Process contours to find bubbles
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = window.cv.contourArea(contour);

        if (
          area < OMR_CONFIG.minBubbleArea ||
          area > OMR_CONFIG.maxBubbleArea
        ) {
          continue;
        }

        const rect = window.cv.boundingRect(contour);
        const aspectRatio = rect.width / rect.height;

        // Check if contour is circular-ish (0.7 - 1.3 aspect ratio for bubbles)
        if (aspectRatio < 0.7 || aspectRatio > 1.3) {
          continue;
        }

        const isFilled = isContourFilled(contour, binary, OMR_CONFIG.fillThreshold);

        // Cluster contours into rows and columns to identify Q/A pairs
        const rowIndex = Math.floor(rect.y / (rect.height + OMR_CONFIG.bubbleRowGap));
        const colIndex = Math.floor(
          rect.x / (rect.width + OMR_CONFIG.bubbleColGap)
        );

        const questionId = `q${rowIndex + 1}`;
        const answerLabels = ["a", "b", "c", "d"];
        const detectedAnswer = answerLabels[colIndex] || null;

        const expectedAnswer =
          MOCK_ANSWER_KEY[
            questionId as keyof typeof MOCK_ANSWER_KEY
          ] || null;

        if (detectedAnswer && expectedAnswer) {
          const isCorrect = isFilled ? detectedAnswer === expectedAnswer : null;

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

      // Cleanup
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
  }, []);

  /**
   * Draw AR overlays on the display canvas
   */
  const drawOverlays = useCallback((results: BubbleResult[]) => {
    if (!displayCanvasRef.current || !videoRef.current) return;

    const ctx = displayCanvasRef.current.getContext("2d");
    if (!ctx) return;

    displayCanvasRef.current.width = videoRef.current.videoWidth;
    displayCanvasRef.current.height = videoRef.current.videoHeight;

    // Clear canvas
    ctx.clearRect(
      0,
      0,
      displayCanvasRef.current.width,
      displayCanvasRef.current.height
    );

    results.forEach((result) => {
      const { bounds, isCorrect } = result;

      // Determine color based on correctness
      const strokeColor = isCorrect === true ? "#22c55e" : isCorrect === false ? "#ef4444" : "#64748b";
      const fillColor =
        isCorrect === true
          ? "rgba(34, 197, 94, 0.15)"
          : isCorrect === false
          ? "rgba(239, 68, 68, 0.15)"
          : "rgba(100, 114, 139, 0.10)";

      // Draw bounding box
      ctx.fillStyle = fillColor;
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

      // Draw checkmark or X
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const size = Math.min(bounds.width, bounds.height) * 0.5;

      ctx.fillStyle = strokeColor;
      ctx.font = `bold ${size}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (isCorrect === true) {
        ctx.fillText("✓", centerX, centerY);
      } else if (isCorrect === false) {
        ctx.fillText("✕", centerX, centerY);
      }
    });
  }, []);

  /**
   * Main processing loop
   */
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

  /**
   * Start the scanner
   */
  const handleStartScanner = useCallback(async () => {
    if (!openCVLoaded) {
      setError("OpenCV.js is still loading. Please wait...");
      return;
    }

    if (cameraPermission !== "granted") {
      await requestCameraAccess();
      return;
    }

    isRunningRef.current = true;
    setIsScanning(true);
    setError(null);

    // Start the processing loop
    rafIdRef.current = requestAnimationFrame(() => startScanningLoop());
  }, [openCVLoaded, cameraPermission, requestCameraAccess, startScanningLoop]);

  /**
   * Reset the scanner
   */
  const handleReset = useCallback(() => {
    setBubbleResults([]);
    setStats({
      fps: 0,
      bubblesDetected: 0,
      correctAnswers: 0,
      totalAnswers: 0,
    });
  }, []);

  return (
    <section
      className="rounded-3xl border border-dark-teal/10 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-8"
      aria-labelledby="scanner-heading"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h2
            id="scanner-heading"
            className="text-xl font-extrabold tracking-tight text-navy sm:text-2xl"
          >
            Real-Time Mark Paper Scanner
          </h2>
          <p className="text-sm text-navy/65">
            Point your camera at a multiple-choice answer sheet. The scanner will
            detect bubbles in real-time and compare them against the answer key.
          </p>
        </div>

        {/* Status Indicator */}
        {openCVLoaded && (
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`h-2 w-2 rounded-full ${
                openCVLoaded ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            <span className="text-navy/70">
              {openCVLoaded
                ? "Computer vision ready"
                : "Loading computer vision..."}
            </span>
          </div>
        )}

        {/* Camera Feed Container */}
        <div className="relative w-full overflow-hidden rounded-2xl border border-dark-teal/10 bg-navy/5">
          {cameraPermission !== "granted" ? (
            <div className="flex h-96 flex-col items-center justify-center gap-4 bg-soft-teal/30">
              <Camera className="h-12 w-12 text-navy/40" />
              <p className="text-sm font-medium text-navy/60">
                Camera access required
              </p>
            </div>
          ) : (
            <>
              {/* Video Element (Hidden) */}
              <video
                ref={videoRef}
                className={`w-full ${isScanning ? "block" : "block"}`}
                playsInline
                muted
              />

              {/* Processing Canvas (Hidden) */}
              <canvas ref={processingCanvasRef} className="hidden" />

              {/* Display Canvas (Overlay) */}
              <canvas
                ref={displayCanvasRef}
                className="absolute inset-0 h-full w-full"
              />

              {/* FPS and Stats Overlay */}
              {isScanning && (
                <div className="absolute right-4 top-4 space-y-1 rounded-xl bg-black/50 px-3 py-2 backdrop-blur-sm">
                  <div className="text-xs font-semibold text-white">
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
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Control Buttons */}
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

        {/* Results Summary */}
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

            {/* Detailed Results */}
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

        {/* Info Box */}
        <div className="rounded-2xl border border-sky-blue/20 bg-sky-blue/5 p-4 text-sm text-navy/75">
          <p className="font-medium text-navy">
            Tips for best results:
          </p>
          <ul className="mt-2 space-y-1 list-inside text-xs">
            <li>• Keep the paper flat and well-lit</li>
            <li>• Position the camera perpendicular to the page</li>
            <li>• Ensure all bubbles are clearly visible</li>
            <li>• Avoid shadows and glare on the page</li>
          </ul>
        </div>
      </div>
    </section>
  );
}