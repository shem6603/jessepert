"use client";

import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, RefreshCw, FileText, X, Image as ImageIcon } from 'lucide-react';

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

  // Configuration for how many photos to process at once in the background
  const MAX_CONCURRENT_UPLOADS = 2;

  // Cleanup object URLs when component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      queue.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

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
    <div className="w-full max-w-5xl mx-auto rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[85vh]">
      
      {/* 1. STICKY PROGRESS BAR & HEADER */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Batch Grader</h2>
            <p className="text-sm text-gray-500 font-medium">Snap & Go Background Processing</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Photos
            </button>
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

        {totalFiles > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm font-semibold text-gray-700">
              <span className="flex items-center gap-2">
                Grading Progress
                {processingFiles > 0 && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
              </span>
              <span>{completedFiles} / {totalFiles} Completed</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            {completedFiles === totalFiles && totalFiles > 0 && (
              <div className="flex justify-end mt-1">
                 <button onClick={clearCompleted} className="text-xs text-gray-500 hover:text-gray-800 transition-colors">
                  Clear Completed
                 </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. MAIN SCROLLABLE AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50">
        
        {totalFiles === 0 ? (
          /* EMPTY STATE / DRAG & DROP ZONE */
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`h-full w-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-transparent'
            }`}
          >
            <div className="p-4 bg-white shadow-sm rounded-full mb-4">
              <UploadCloud className={`w-10 h-10 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Drag and drop assignments</h3>
            <p className="text-sm text-gray-500 max-w-xs text-center mb-6">
              Drop up to 30 images or PDFs here, or click upload. We'll grade them in the background.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm"
            >
              Browse Files
            </button>
          </div>
        ) : (
          /* 3. QUEUE GRID */
          <div 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {/* Adding dropzone indicator overlay if dragging over populated list */}
            {isDragging && (
              <div className="absolute inset-x-4 inset-y-[100px] z-20 bg-blue-50/90 border-2 border-blue-500 border-dashed rounded-xl flex items-center justify-center">
                <p className="text-2xl font-bold text-blue-600 flex items-center gap-3">
                  <UploadCloud className="w-8 h-8"/> Drop to add to queue
                </p>
              </div>
            )}
            
            {queue.map(item => (
              <div 
                key={item.id} 
                className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow aspect-[3/4] flex flex-col"
              >
                {/* Delete Button (visible on hover or error) */}
                {(item.status === 'pending' || item.status === 'error' || item.status === 'completed') && (
                  <button 
                    onClick={() => removeFile(item.id)}
                    className="absolute top-2 right-2 z-10 p-1.5 bg-black/40 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* THUMBNAIL */}
                <div className="relative flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {item.previewUrl ? (
                    <img 
                      src={item.previewUrl} 
                      alt="Paper Scan" 
                      className={`w-full h-full object-cover ${item.status === 'processing' ? 'opacity-60 saturate-50' : 'opacity-100'}`} 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      {item.file.type.includes('pdf') ? <FileText className="w-10 h-10 mb-2" /> : <ImageIcon className="w-10 h-10 mb-2" />}
                      <span className="text-xs font-medium text-gray-500 truncate max-w-[80px]">{item.file.name.split('.').pop()?.toUpperCase()}</span>
                    </div>
                  )}

                  {/* OVERLAY INDICATORS */}
                  {item.status === 'processing' && (
                    <div className="absolute inset-0 bg-gray-900/10 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="bg-white/90 p-3 rounded-full shadow-lg">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      </div>
                    </div>
                  )}

                  {item.status === 'completed' && (
                    <div className="absolute top-3 left-3 bg-white rounded-full p-0.5 shadow-sm">
                      <CheckCircle2 className="w-6 h-6 text-green-500 fill-green-50" />
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div className="absolute inset-0 bg-red-900/10 flex flex-col items-center justify-center backdrop-blur-[1px]">
                      <div className="bg-white p-2 rounded-full shadow-lg text-red-500 mb-2">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <button 
                        onClick={() => retryFile(item)}
                        className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1 hover:bg-gray-50"
                      >
                        <RefreshCw className="w-3 h-3" /> Retry
                      </button>
                    </div>
                  )}
                </div>

                {/* FOOTER DETAIL (Student Name / File Name) */}
                <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0 min-h-[64px]">
                  {item.status === 'completed' && item.resultData ? (
                    <div>
                      <p className="text-sm font-bold text-gray-900 truncate">{item.resultData.studentName}</p>
                      <p className="text-xs font-medium text-green-600">Score: {item.resultData.score}%</p>
                    </div>
                  ) : item.status === 'error' ? (
                     <div>
                       <p className="text-xs font-bold text-red-600">Scan Failed</p>
                       <p className="text-[10px] text-gray-500 truncate">{item.file.name}</p>
                     </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-gray-700 truncate">{item.file.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                         {(item.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
