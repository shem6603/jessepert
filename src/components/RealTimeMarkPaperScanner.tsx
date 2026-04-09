"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    cv?: unknown;
  }
}

type BubbleRect = { x: number; y: number; w: number; h: number };

const CHOICES = ["A", "B", "C", "D"] as const;

function isOpenCvReady(cv: unknown): cv is { Mat: unknown } {
  return Boolean(
    cv &&
      typeof (cv as { Mat?: unknown }).Mat === "function",
  );
}

async function loadOpenCvOnce() {
  if (typeof window === "undefined") return;
  if (isOpenCvReady(window.cv)) return;

  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-opencv="true"]',
  );
  if (!existing) {
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;
    script.defer = true;
    script.dataset.opencv = "true";
    document.body.appendChild(script);
  }

  const start = performance.now();
  const timeoutMs = 15000;
  // Poll until OpenCV is ready (cv.Mat exists)
  while (true) {
    if (isOpenCvReady(window.cv)) return;
    if (performance.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for OpenCV.js to initialize.");
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

export default function RealTimeMarkPaperScanner() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const lastProcessMsRef = useRef(0);
  const videoFrameCbIdRef = useRef<number | null>(null);
  const lastPaperCornersRef = useRef<Array<{ x: number; y: number }> | null>(
    null,
  );
  const stableFramesRef = useRef(0);

  const [opencvReady, setOpencvReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Mock answer key: Q1:A, Q2:C, ...
  const answerKey = useMemo(() => {
    return ["A", "C", "B", "D", "A", "B", "C", "D", "C", "A"] as const;
  }, []);

  const selectedByQuestionRef = useRef<Map<number, number>>(new Map());

  const resizeCanvasesToVideo = useCallback(() => {
    const video = videoRef.current;
    const overlay = overlayCanvasRef.current;
    const processing = processingCanvasRef.current;
    const container = containerRef.current;

    if (!video || !overlay || !processing || !container) return;
    if (!video.videoWidth || !video.videoHeight) return;

    // Mobile optimization: process at a smaller resolution to keep CPU/battery reasonable.
    // (Overlay is still full-size; we map coordinates.)
    const maxProcessWidth = 960;
    const scale = Math.min(1, maxProcessWidth / video.videoWidth);
    processing.width = Math.max(1, Math.floor(video.videoWidth * scale));
    processing.height = Math.max(1, Math.floor(video.videoHeight * scale));

    const rect = container.getBoundingClientRect();
    overlay.width = Math.max(1, Math.floor(rect.width));
    overlay.height = Math.max(1, Math.floor(rect.height));
  }, []);

  const setTorch = useCallback(async (next: boolean) => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;

    // Torch is not supported everywhere; check capabilities first.
    const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
    if (!caps.torch) return;

    try {
      await track.applyConstraints({ advanced: [{ torch: next } as unknown as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      // ignore
    }
  }, []);

  const stop = useCallback(async () => {
    runningRef.current = false;
    setRunning(false);
    setStatus("Stopping…");

    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (videoFrameCbIdRef.current != null) {
      const v = videoRef.current as unknown as {
        cancelVideoFrameCallback?: (id: number) => void;
      };
      v.cancelVideoFrameCallback?.(videoFrameCbIdRef.current);
      videoFrameCbIdRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    setTorchAvailable(false);
    setTorchOn(false);

    const overlay = overlayCanvasRef.current;
    if (overlay) {
      const ctx = overlay.getContext("2d");
      ctx?.clearRect(0, 0, overlay.width, overlay.height);
    }

    setStatus("Idle");
  }, []);

  const processFrameAndDrawOverlay = useCallback(() => {
    const cv = window.cv as
      | undefined
      | {
          Mat: new () => { delete: () => void };
          MatVector: new () => { size: () => number; get: (i: number) => unknown; delete: () => void };
          Size: new (w: number, h: number) => unknown;
          Rect: new (x: number, y: number, w: number, h: number) => unknown;
          COLOR_RGBA2GRAY: number;
          THRESH_BINARY_INV: number;
          THRESH_OTSU: number;
          RETR_EXTERNAL: number;
          CHAIN_APPROX_SIMPLE: number;
          imread: (c: HTMLCanvasElement) => { delete: () => void };
          cvtColor: (src: unknown, dst: unknown, code: number) => void;
          GaussianBlur: (src: unknown, dst: unknown, ksize: unknown, sigmaX: number) => void;
          Canny: (image: unknown, edges: unknown, t1: number, t2: number) => void;
          threshold: (src: unknown, dst: unknown, thresh: number, maxVal: number, type: number) => void;
          findContours: (image: unknown, contours: unknown, hierarchy: unknown, mode: number, method: number) => void;
          boundingRect: (cnt: unknown) => { x: number; y: number; width: number; height: number };
          contourArea: (cnt: unknown) => number;
          arcLength: (curve: unknown, closed: boolean) => number;
          approxPolyDP: (curve: unknown, approxCurve: unknown, epsilon: number, closed: boolean) => void;
          countNonZero: (src: unknown) => number;
        };
    if (!cv) return;

    const video = videoRef.current;
    const overlay = overlayCanvasRef.current;
    const processing = processingCanvasRef.current;
    if (!video || !overlay || !processing) return;
    if (!video.videoWidth || !video.videoHeight) return;

    const pctx = processing.getContext("2d", { willReadFrequently: true });
    const octx = overlay.getContext("2d");
    if (!pctx || !octx) return;

    resizeCanvasesToVideo();

    // Throttle processing to reduce battery/heat on phones.
    // 12–18 FPS is usually enough for "live" scanning feedback.
    const now = performance.now();
    const minFrameMs = 1000 / 15;
    if (now - lastProcessMsRef.current < minFrameMs) return;
    lastProcessMsRef.current = now;

    pctx.drawImage(video, 0, 0, processing.width, processing.height);

    const src = cv.imread(processing); // RGBA
    const gray = new cv.Mat();
    const blur = new cv.Mat();
    const edges = new cv.Mat();
    const bin = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    const paperContours = new cv.MatVector();
    const paperHierarchy = new cv.Mat();
    const approx = new cv.Mat();

    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);

      // "Hold steady" assist: detect the paper outer edges and approximate to a 4-corner polygon.
      // This is a heuristic approach that works best with good contrast (paper vs background).
      cv.Canny(blur, edges, 60, 160);
      cv.findContours(edges, paperContours, paperHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      cv.threshold(blur, bin, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
      cv.findContours(bin, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      const bubbles: BubbleRect[] = [];
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const rect = cv.boundingRect(cnt);
        const area = rect.width * rect.height;

        if (area < 250 || area > 25000) continue;
        const aspect = rect.width / rect.height;
        if (aspect < 0.6 || aspect > 1.4) continue;

        const cntArea = cv.contourArea(cnt);
        const fill = cntArea / area;
        if (fill < 0.2 || fill > 0.95) continue;

        bubbles.push({ x: rect.x, y: rect.y, w: rect.width, h: rect.height });
      }

      bubbles.sort((a, b) => (a.y - b.y) || (a.x - b.x));

      const rows: BubbleRect[][] = [];
      const rowTolerance = 18;
      for (const r of bubbles) {
        const row = rows.find((x) => Math.abs(x[0].y - r.y) < rowTolerance);
        if (row) row.push(r);
        else rows.push([r]);
      }
      for (const row of rows) row.sort((a, b) => a.x - b.x);

      selectedByQuestionRef.current.clear();
      const maxQuestions = Math.min(rows.length, answerKey.length);

      for (let q = 0; q < maxQuestions; q++) {
        const row = rows[q].slice(0, 4);
        if (row.length < 2) continue;

        const ratios = row.map((r) => {
          // `roi` is a Mat view; must delete it.
          const roi = (bin as unknown as { roi: (rect: unknown) => { delete: () => void } }).roi(
            new cv.Rect(r.x, r.y, r.w, r.h),
          );
          const nonZero = cv.countNonZero(roi);
          const ratio = nonZero / (r.w * r.h);
          roi.delete();
          return ratio;
        });

        let bestIdx = 0;
        for (let i = 1; i < ratios.length; i++) {
          if (ratios[i] > ratios[bestIdx]) bestIdx = i;
        }

        const minFillToCount = 0.18;
        const selectedIdx = ratios[bestIdx] >= minFillToCount ? bestIdx : -1;
        selectedByQuestionRef.current.set(q, selectedIdx);
      }

      octx.clearRect(0, 0, overlay.width, overlay.height);

      const sx = overlay.width / processing.width;
      const sy = overlay.height / processing.height;

      // --- Paper alignment guides (AR overlay) ---
      const extractApproxPoints = (m: unknown) => {
        // approx is Nx1x2 CV_32S or CV_32F depending on OpenCV build.
        const anyMat = m as unknown as {
          data32S?: Int32Array;
          data32F?: Float32Array;
          rows?: number;
        };
        const pts: Array<{ x: number; y: number }> = [];
        if (anyMat.data32S && anyMat.data32S.length >= 8) {
          for (let i = 0; i < anyMat.data32S.length; i += 2) {
            pts.push({ x: anyMat.data32S[i]!, y: anyMat.data32S[i + 1]! });
          }
        } else if (anyMat.data32F && anyMat.data32F.length >= 8) {
          for (let i = 0; i < anyMat.data32F.length; i += 2) {
            pts.push({ x: anyMat.data32F[i]!, y: anyMat.data32F[i + 1]! });
          }
        }
        return pts;
      };

      const orderCorners = (pts: Array<{ x: number; y: number }>) => {
        // Order: top-left, top-right, bottom-right, bottom-left
        // Based on sum/diff heuristics.
        const sums = pts.map((p) => p.x + p.y);
        const diffs = pts.map((p) => p.x - p.y);
        const tl = pts[sums.indexOf(Math.min(...sums))]!;
        const br = pts[sums.indexOf(Math.max(...sums))]!;
        const tr = pts[diffs.indexOf(Math.max(...diffs))]!;
        const bl = pts[diffs.indexOf(Math.min(...diffs))]!;
        return [tl, tr, br, bl];
      };

      const drawCornerGuide = (p: { x: number; y: number }, color: string) => {
        const x = p.x * sx;
        const y = p.y * sy;
        octx.save();
        octx.strokeStyle = color;
        octx.lineWidth = 4;
        octx.shadowColor = "rgba(0,0,0,0.18)";
        octx.shadowBlur = 10;
        const len = 22;
        // L-shape corner
        octx.beginPath();
        octx.moveTo(x - len, y);
        octx.lineTo(x, y);
        octx.lineTo(x, y - len);
        octx.stroke();
        octx.restore();
      };

      const drawBanner = (text: string, tone: "neutral" | "good" | "warn") => {
        const bg =
          tone === "good"
            ? "rgba(34,197,94,0.14)"
            : tone === "warn"
              ? "rgba(245,158,11,0.16)"
              : "rgba(15,23,42,0.10)";
        const fg =
          tone === "good"
            ? "rgba(6,95,70,0.95)"
            : tone === "warn"
              ? "rgba(146,64,14,0.95)"
              : "rgba(15,23,42,0.75)";

        octx.save();
        const padX = 14;
        const padY = 10;
        const w = Math.min(overlay.width - 24, 420);
        const x = 12;
        const y = 12;
        const h = 42;
        octx.fillStyle = bg;
        octx.strokeStyle = "rgba(15,23,42,0.08)";
        octx.lineWidth = 1;
        // rounded rect
        const r = 14;
        octx.beginPath();
        octx.moveTo(x + r, y);
        octx.arcTo(x + w, y, x + w, y + h, r);
        octx.arcTo(x + w, y + h, x, y + h, r);
        octx.arcTo(x, y + h, x, y, r);
        octx.arcTo(x, y, x + w, y, r);
        octx.closePath();
        octx.fill();
        octx.stroke();
        octx.fillStyle = fg;
        octx.font = "800 14px system-ui, sans-serif";
        octx.fillText(text, x + padX, y + padY + 16);
        octx.restore();
      };

      let paperCorners: Array<{ x: number; y: number }> | null = null;
      let paperArea = 0;

      for (let i = 0; i < paperContours.size(); i++) {
        const cnt = paperContours.get(i);
        const area = cv.contourArea(cnt);
        if (area < paperArea) continue;

        // Approximate polygon
        const peri = cv.arcLength(cnt, true);
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        const pts = extractApproxPoints(approx);
        // We only want a clear quadrilateral.
        if (pts.length === 4) {
          paperArea = area;
          paperCorners = orderCorners(pts);
        }
      }

      if (!paperCorners || paperArea < processing.width * processing.height * 0.15) {
        // Not enough of the frame is paper; prompt user.
        lastPaperCornersRef.current = null;
        stableFramesRef.current = 0;
        drawBanner("Align the paper in frame (move closer)", "warn");
      } else {
        // Compute stability vs last frame
        const last = lastPaperCornersRef.current;
        if (last) {
          const deltas = paperCorners.map((p, idx) => {
            const dx = p.x - last[idx]!.x;
            const dy = p.y - last[idx]!.y;
            return Math.hypot(dx, dy);
          });
          const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

          // Threshold in processing pixels; tune for your target downscale.
          if (avgDelta < 2.5) stableFramesRef.current += 1;
          else stableFramesRef.current = 0;
        } else {
          stableFramesRef.current = 0;
        }

        lastPaperCornersRef.current = paperCorners;

        // Draw polygon + corner guides
        const color =
          stableFramesRef.current >= 10
            ? "rgba(34,197,94,0.95)"
            : "rgba(14,165,233,0.95)";

        octx.save();
        octx.strokeStyle = color;
        octx.lineWidth = 3;
        octx.shadowColor = "rgba(0,0,0,0.12)";
        octx.shadowBlur = 10;
        octx.beginPath();
        octx.moveTo(paperCorners[0]!.x * sx, paperCorners[0]!.y * sy);
        for (let i = 1; i < 4; i++) {
          octx.lineTo(paperCorners[i]!.x * sx, paperCorners[i]!.y * sy);
        }
        octx.closePath();
        octx.stroke();
        octx.restore();

        drawCornerGuide(paperCorners[0]!, color);
        // Top-right
        drawCornerGuide(paperCorners[1]!, color);
        // Bottom-right
        drawCornerGuide(paperCorners[2]!, color);
        // Bottom-left
        drawCornerGuide(paperCorners[3]!, color);

        if (stableFramesRef.current >= 10) {
          drawBanner("Locked — scanning", "good");
        } else {
          drawBanner("Hold steady…", "neutral");
        }
      }

      const drawRect = (r: BubbleRect, color: string, label: string) => {
        octx.save();
        octx.strokeStyle = color;
        octx.lineWidth = 3;
        octx.shadowColor = "rgba(0,0,0,0.15)";
        octx.shadowBlur = 8;
        octx.strokeRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
        octx.shadowBlur = 0;
        octx.fillStyle = color;
        octx.font = "700 16px system-ui, sans-serif";
        octx.fillText(label, r.x * sx + 6, r.y * sy + 18);
        octx.restore();
      };

      for (let q = 0; q < maxQuestions; q++) {
        const row = rows[q]?.slice(0, 4) ?? [];
        const selectedIdx = selectedByQuestionRef.current.get(q) ?? -1;
        if (selectedIdx < 0 || selectedIdx >= row.length) continue;

        const correct = answerKey[q];
        const correctIdx = CHOICES.indexOf(correct);
        const isCorrect = selectedIdx === correctIdx;
        const r = row[selectedIdx];

        drawRect(
          r,
          isCorrect ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.95)",
          isCorrect ? "✓" : "✕",
        );
      }
    } finally {
      src.delete();
      gray.delete();
      blur.delete();
      edges.delete();
      bin.delete();
      contours.delete();
      hierarchy.delete();
      paperContours.delete();
      paperHierarchy.delete();
      approx.delete();
    }
  }, [answerKey, resizeCanvasesToVideo]);

  const start = useCallback(async () => {
    setError(null);
    setStatus("Loading OpenCV…");

    try {
      await loadOpenCvOnce();
      setOpencvReady(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load OpenCV");
      setStatus("OpenCV failed");
      return;
    }

    try {
      setStatus("Requesting camera…");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element not ready");

      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      await video.play();

      // Prefer continuous focus/exposure/white balance on mobile if supported.
      const track = stream.getVideoTracks()[0];
      const caps = (track.getCapabilities?.() ?? {}) as Record<string, unknown>;
      const advanced: MediaTrackConstraintSet[] = [];
      if (typeof caps.focusMode !== "undefined") {
        advanced.push({ focusMode: "continuous" } as unknown as MediaTrackConstraintSet);
      }
      if (typeof caps.exposureMode !== "undefined") {
        advanced.push({ exposureMode: "continuous" } as unknown as MediaTrackConstraintSet);
      }
      if (typeof caps.whiteBalanceMode !== "undefined") {
        advanced.push({ whiteBalanceMode: "continuous" } as unknown as MediaTrackConstraintSet);
      }
      if (advanced.length) {
        try {
          await track.applyConstraints({ advanced });
        } catch {
          // ignore
        }
      }

      const torchCap = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
      setTorchAvailable(Boolean(torchCap.torch));

      await new Promise((r) => setTimeout(r, 50));
      resizeCanvasesToVideo();

      runningRef.current = true;
      setRunning(true);
      setStatus("Scanning…");

      // More efficient on mobile if supported: run on decoded video frames.
      const v = video as unknown as {
        requestVideoFrameCallback?: (cb: (now: number) => void) => number;
      };
      if (typeof v.requestVideoFrameCallback === "function") {
        const cb = () => {
          if (!runningRef.current) return;
          processFrameAndDrawOverlay();
          videoFrameCbIdRef.current = v.requestVideoFrameCallback!(cb);
        };
        videoFrameCbIdRef.current = v.requestVideoFrameCallback(cb);
      } else {
        const loop = () => {
          if (!runningRef.current) return;
          processFrameAndDrawOverlay();
          rafIdRef.current = requestAnimationFrame(loop);
        };
        rafIdRef.current = requestAnimationFrame(loop);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Camera access failed");
      setStatus("Camera failed");
      await stop();
    }
  }, [processFrameAndDrawOverlay, resizeCanvasesToVideo, stop]);

  useEffect(() => {
    const onResize = () => resizeCanvasesToVideo();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [resizeCanvasesToVideo]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-3xl border border-dark-teal/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold tracking-tight text-navy sm:text-xl">
                Real-Time Mark Paper Scanner
              </h2>
              <p className="mt-1 text-sm text-navy/65">
                Live OMR demo: scans continuously and draws AR overlays.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => void start()}
                disabled={running}
                className={`min-h-[44px] rounded-2xl px-4 py-2.5 text-sm font-extrabold shadow-sm transition ${
                  running
                    ? "cursor-not-allowed bg-navy/10 text-navy/40"
                    : "bg-sky-blue text-white shadow-sky-blue/20 hover:bg-sky-blue/90 active:scale-[0.99]"
                }`}
              >
                Start Scanner
              </button>
              <button
                type="button"
                onClick={() => void stop()}
                disabled={!running}
                className={`min-h-[44px] rounded-2xl px-4 py-2.5 text-sm font-extrabold shadow-sm transition ${
                  !running
                    ? "cursor-not-allowed bg-navy/10 text-navy/40"
                    : "border border-dark-teal/15 bg-white/80 text-dark-teal hover:bg-soft-teal/60 active:scale-[0.99]"
                }`}
              >
                Stop Scanner
              </button>

              {torchAvailable && (
                <button
                  type="button"
                  onClick={() => void setTorch(!torchOn)}
                  disabled={!running}
                  className={`min-h-[44px] rounded-2xl px-4 py-2.5 text-sm font-extrabold shadow-sm transition ${
                    !running
                      ? "cursor-not-allowed bg-navy/10 text-navy/40"
                      : torchOn
                        ? "bg-emerald-600 text-white hover:bg-emerald-600/90 active:scale-[0.99]"
                        : "border border-dark-teal/15 bg-white/80 text-dark-teal hover:bg-soft-teal/60 active:scale-[0.99]"
                  }`}
                >
                  {torchOn ? "Torch on" : "Torch"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                running ? "bg-sky-blue/10 text-sky-blue" : "bg-navy/5 text-navy/60"
              }`}
            >
              {status}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                opencvReady
                  ? "bg-emerald-500/10 text-emerald-700"
                  : "bg-navy/5 text-navy/60"
              }`}
            >
              OpenCV: {opencvReady ? "Ready" : "Not loaded"}
            </span>
            {error && (
              <span className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-700">
                {error}
              </span>
            )}
          </div>

          <div className="mt-5">
            <div
              ref={containerRef}
              className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl border border-dark-teal/10 bg-navy/5 shadow-sm sm:aspect-[16/10]"
            >
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                playsInline
                muted
              />
              <canvas ref={overlayCanvasRef} className="absolute inset-0 h-full w-full" />
              {!running && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="max-w-sm rounded-2xl bg-white/80 p-4 text-center text-sm text-navy/70 shadow-sm ring-1 ring-dark-teal/10 backdrop-blur-sm">
                    Tap <span className="font-extrabold text-navy">Start Scanner</span>{" "}
                    to open the rear camera and begin scanning continuously.
                  </div>
                </div>
              )}
            </div>
          </div>

          <canvas ref={processingCanvasRef} className="hidden" />

          <div className="mt-5 text-xs text-navy/55">
            For best results: good lighting, flat page, fill bubbles darkly. For
            production OMR, add perspective correction + known template alignment.
          </div>
        </div>
      </div>
    </div>
  );
}

