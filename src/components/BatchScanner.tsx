"use client";

import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, RefreshCw, FileText, X, Image as ImageIcon, Camera } from 'lucide-react';

interface ScanResult {
  studentName?: string;
  score?: number;
  feedback?: string;
  [key: string]: any;
}

export interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  resultData?: ScanResult;
}

export default function BatchScanner() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Configuration for how many photos to process at once in the background
  const MAX_CONCURRENT_UPLOADS = 2;

  // Cleanup object URLs when component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      queue.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(console.error);
      };
    }
  }, [cameraActive]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], `snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
          handleFiles([file]);
        }
      }, 'image/jpeg', 0.8);
    }
  };

  // Main processing queue orchestrator
  useEffect(() => {
    const processingCount = queue.filter(item => item.status === 'processing').length;
    const pendingItems = queue.filter(item => item.status === 'pending');

    if (processingCount < MAX_CONCURRENT_UPLOADS && pendingItems.length > 0) {
      const itemsToStart = pendingItems.slice(0, MAX_CONCURRENT_UPLOADS - processingCount);
      
      itemsToStart.forEach(item => {
        // Kick off the async processing slightly outside the render phase
        setTimeout(() => processFile(item), 0);
      });
    }
  }, [queue]);

  const processFile = async (item: QueueItem) => {
    // Optimistically set to processing
    setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'processing' } : q));

    try {
      /* 
      // PRODUCTION CODE:
      const formData = new FormData();
      formData.append('file', item.file);

      const response = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const data = await response.json();
      */

      // MOCK GRADING DELAY (2 to 5 seconds per paper)
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      
      // Simulate random failure (10% chance) for demonstrating error handling UI
      if (Math.random() < 0.1) {
        throw new Error("Network timeout or unreadable image");
      }

      const mockResult: ScanResult = {
        studentName: `Student ${Math.floor(Math.random() * 100)}`,
        score: Math.floor(60 + Math.random() * 40),
        feedback: "Good attempt, check workings."
      };

      setQueue(prev => prev.map(q => 
        q.id === item.id 
          ? { ...q, status: 'completed', resultData: mockResult } 
          : q
      ));
    } catch (error) {
      setQueue(prev => prev.map(q => 
        q.id === item.id ? { ...q, status: 'error' } : q
      ));
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    const newItems: QueueItem[] = Array.from(files).map(file => {
      const previewUrl = file.type.startsWith('image/') 
        ? URL.createObjectURL(file) 
        : ''; 

      return {
        id: crypto.randomUUID(),
        file,
        previewUrl,
        status: 'pending'
      };
    });

    setQueue(prev => [...prev, ...newItems]);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setQueue(prev => {
      const item = prev.find(q => q.id === id);
      if (item && item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter(q => q.id !== id);
    });
  };

  const retryFile = (item: QueueItem) => {
    setQueue(prev => prev.map(q => 
      q.id === item.id ? { ...q, status: 'pending' } : q
    ));
  };

  const clearCompleted = () => {
    setQueue(prev => prev.filter(q => q.status !== 'completed'));
  };

  const totalFiles = queue.length;
  const completedFiles = queue.filter(q => q.status === 'completed').length;
  const processingFiles = queue.filter(q => q.status === 'processing').length;
  const progressPercent = totalFiles === 0 ? 0 : Math.round((completedFiles / totalFiles) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 w-full mt-4">
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-headline font-black text-on-surface tracking-tight mb-2">Batch Grader</h2>
          <p className="text-on-surface-variant text-sm max-w-xl">Process multiple assignments simultaneously. Drop images or PDFs below for instant AI analysis and scoring.</p>
        </div>
        <div className="flex items-center gap-3">
          {!cameraActive && (
            <button
              onClick={startCamera}
              className="bg-surface-container-highest hover:bg-surface-bright text-on-surface px-6 py-2 rounded-full font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 border border-outline-variant/30"
            >
              <Camera className="w-4 h-4" />
              Use Camera
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {cameraActive && (
        <div className="relative w-full max-w-4xl mx-auto bg-black rounded-2xl overflow-hidden mb-6 flex-shrink-0 shadow-lg ring-1 border-2 border-outline-variant/30 aspect-video">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute inset-x-0 bottom-6 flex justify-center gap-4 px-4 overflow-hidden">
              <button onClick={stopCamera} className="bg-black/80 hover:bg-black border border-outline-variant/30 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold transition-all shadow-md">
                Close
              </button>
              <button onClick={takePhoto} className="bg-primary hover:bg-primary-container text-on-primary px-8 py-3 rounded-full font-extrabold shadow-[0_0_20px_rgba(184,253,75,0.2)] transition-all active:scale-95 flex items-center gap-2">
                <Camera className="w-5 h-5"/>
                Snap & Add
              </button>
          </div>
        </div>
      )}

      {/* Progress Bar (Visible only when files exist) */}
      {totalFiles > 0 && (
        <div className="bg-surface-container-low rounded-xl border border-outline-variant/20 p-6 flex flex-col gap-3">
          <div className="flex justify-between text-sm font-bold text-on-surface">
            <span className="flex items-center gap-2">
              Grading Progress
              {processingFiles > 0 && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
            </span>
            <span>{completedFiles} / {totalFiles} Completed</span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-3 overflow-hidden">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(184,253,75,0.5)]"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          {completedFiles === totalFiles && totalFiles > 0 && (
            <div className="flex justify-end mt-2">
                <button onClick={clearCompleted} className="text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">
                Clear Completed
                </button>
            </div>
          )}
        </div>
      )}

      {totalFiles === 0 && !cameraActive ? (
        /* EMPTY STATE / DRAG & DROP ZONE */
        <div 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`bg-surface-container-low rounded-xl border-2 border-dashed p-16 flex flex-col items-center justify-center text-center transition-all group ${
            isDragging ? 'border-primary bg-surface-container' : 'border-outline-variant/30 hover:bg-surface-container'
          }`}
        >
          <div className="w-20 h-20 bg-surface-container-highest rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-4xl text-primary">upload_file</span>
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">Drag and drop assignments</h3>
          <p className="text-on-surface-variant text-sm mb-8">Support for JPG, PNG, and PDF up to 50MB per batch.</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-primary text-on-primary px-8 py-3 rounded-full font-bold text-sm hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(184,253,75,0.15)] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
            Upload Photos
          </button>
        </div>
      ) : (
        /* QUEUE GRID */
        <div 
          className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 relative"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {isDragging && (
            <div className="absolute inset-x-0 inset-y-0 z-20 bg-surface/90 border-2 border-primary border-dashed rounded-xl flex items-center justify-center backdrop-blur-sm">
              <p className="text-2xl font-bold text-primary flex items-center gap-3">
                <UploadCloud className="w-8 h-8"/> Drop to add
              </p>
            </div>
          )}
          
          {queue.map(item => (
            <div 
              key={item.id} 
              className="group relative bg-surface-container-low border border-outline-variant/20 rounded-xl overflow-hidden shadow-sm hover:border-outline-variant transition-colors aspect-[3/4] flex flex-col"
            >
              {(item.status === 'pending' || item.status === 'error' || item.status === 'completed') && (
                <button 
                  onClick={() => removeFile(item.id)}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-black/60 hover:bg-error text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className="relative flex-1 bg-surface-container-highest flex items-center justify-center overflow-hidden">
                {item.previewUrl ? (
                  <img 
                    src={item.previewUrl} 
                    alt="Paper Scan" 
                    className={`w-full h-full object-cover ${item.status === 'processing' ? 'opacity-40 saturate-0' : 'opacity-100'}`} 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-on-surface-variant">
                    {item.file.type.includes('pdf') ? <FileText className="w-10 h-10 mb-2" /> : <ImageIcon className="w-10 h-10 mb-2" />}
                    <span className="text-xs font-bold text-on-surface-variant truncate max-w-[80px]">{item.file.name.split('.').pop()?.toUpperCase()}</span>
                  </div>
                )}

                {item.status === 'processing' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-surface p-3 rounded-full shadow-[0_0_15px_rgba(184,253,75,0.2)] border border-primary/20">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  </div>
                )}

                {item.status === 'completed' && (
                  <div className="absolute top-3 left-3 bg-surface rounded-full p-0.5 shadow-sm border border-primary/30">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                )}

                {item.status === 'error' && (
                  <div className="absolute inset-0 bg-surface/80 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="bg-surface border border-error/30 p-2 rounded-full shadow-lg text-error mb-2">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <button 
                      onClick={() => retryFile(item)}
                      className="bg-error text-on-error text-xs font-bold px-4 py-1.5 rounded-full shadow-md hover:bg-error-dim flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 bg-surface-container-low border-t border-outline-variant/20 flex-shrink-0 min-h-[64px]">
                {item.status === 'completed' && item.resultData ? (
                  <div>
                    <p className="text-sm font-bold text-on-surface truncate">{item.resultData.studentName}</p>
                    <p className="text-xs font-bold text-primary mt-1">Score: {item.resultData.score}%</p>
                  </div>
                ) : item.status === 'error' ? (
                   <div>
                     <p className="text-xs font-bold text-error">Scan Failed</p>
                     <p className="text-[10px] text-on-surface-variant truncate mt-1">{item.file.name}</p>
                   </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-on-surface truncate">{item.file.name}</p>
                    <p className="text-[10px] text-on-surface-variant mt-1 font-medium">
                       {(item.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bento Grid Secondary Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="bg-surface-container-lowest rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="material-symbols-outlined text-secondary mb-4">bolt</span>
          <h4 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-1">Grading Speed</h4>
          <p className="text-2xl font-black text-on-surface">~1.2s <span className="text-sm font-normal text-on-surface-variant">/ paper</span></p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="material-symbols-outlined text-primary mb-4">verified</span>
          <h4 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-1">AI Confidence</h4>
          <p className="text-2xl font-black text-on-surface">98.4% <span className="text-sm font-normal text-primary">High</span></p>
        </div>
        <div className="bg-surface-variant/60 backdrop-blur-md rounded-xl p-6 relative overflow-hidden group border border-outline-variant/10">
          <span className="material-symbols-outlined text-on-surface mb-4">memory</span>
          <h4 className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-1">Active Model</h4>
          <p className="text-lg font-bold text-on-surface">Kinetic Vision V3</p>
          <div className="mt-2 inline-flex items-center gap-1 bg-secondary-container px-2 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse"></div>
            <span className="text-[10px] uppercase font-bold text-on-secondary-container tracking-wider">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}
