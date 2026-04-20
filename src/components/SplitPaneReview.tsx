"use client";

import React, { useState, useRef, MouseEvent } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Check, 
  RotateCcw, 
  Flag, 
  Maximize, 
  Edit3, 
  User, 
  Award,
  ArrowLeft
} from 'lucide-react';

import { RubricMacros } from './RubricMacros';

export interface GradedPaperResult {
  studentName: string;
  score: number;
  maxScore: number;
  strengths: string;
  improvements: string;
  suggested_macros?: string[];
}

export interface SplitPaneReviewProps {
  imageUrl: string;
  initialData: GradedPaperResult;
  onApprove: (data: GradedPaperResult) => void;
  onRegrade: () => void;
  onFlag: () => void;
  onCancel?: () => void;
}

export default function SplitPaneReview({
  imageUrl,
  initialData,
  onApprove,
  onRegrade,
  onFlag,
  onCancel
}: SplitPaneReviewProps) {
  // AI Feedback Editable State
  const [data, setData] = useState<GradedPaperResult>(initialData);

  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 }); // reset pan
      return newScale;
    });
  };
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Pan handlers using vanilla React
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (scale <= 1) return; // Only allow pan if zoomed in
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartPos.current.x,
      y: e.clientY - dragStartPos.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleChange = (field: keyof GradedPaperResult, value: string | number | string[]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleAppendMacro = (macro: string) => {
    setData(prev => {
      const currentText = prev.improvements?.trim() || "";
      const newText = currentText ? `${currentText}\n- ${macro}` : `- ${macro}`;
      return { ...prev, improvements: newText };
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50/50 relative rounded-2xl border border-gray-200 overflow-hidden shadow-xl">
      
      {/* ── TOP NAV BAR ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10 w-full shrink-0">
        <div className="flex items-center gap-4">
          {onCancel && (
            <button 
              onClick={onCancel}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
            >
               <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold text-navy hidden sm:block">Review Grading</h2>
            <p className="text-xs text-gray-500 font-medium">Verify AI suggestions before saving</p>
          </div>
        </div>
        
        {/* ACTION BAR (Top-Right on strict desktop, but also fixed bottom on mobile) */}
        <div className="hidden sm:flex items-center gap-3">
          <button 
            onClick={onFlag}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors text-sm font-semibold"
          >
            <Flag className="w-4 h-4" /> Flag as Illegible
          </button>
          <button 
            onClick={onRegrade}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors text-sm font-semibold shadow-sm"
          >
            <RotateCcw className="w-4 h-4" /> Request Regrade
          </button>
          <button 
            onClick={() => onApprove(data)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all shadow-md hover:shadow-lg text-sm font-bold active:scale-95"
          >
            <Check className="w-4 h-4" /> Approve & Save
          </button>
        </div>
      </div>

      {/* ── SPLIT PANE CONTAINER ── */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
        
        {/* ── LEFT PANE: IMAGE VIEWER ── */}
        <div className="w-full md:w-1/2 lg:w-7/12 relative bg-gray-900 border-b md:border-b-0 md:border-r border-gray-300 flex flex-col shrink-0 min-h-[300px] md:min-h-0">
          
          {/* Internal image toolbar */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <div className="flex bg-black/50 backdrop-blur-md rounded-xl p-1 shadow-lg shadow-black/20 border border-white/10">
              <button onClick={handleZoomIn} className="p-2 text-white hover:text-sky-blue hover:bg-white/10 rounded-lg transition-colors" title="Zoom In">
                <ZoomIn className="w-5 h-5" />
              </button>
              <button 
                onClick={handleZoomOut} 
                disabled={scale === 1}
                className={`p-2 rounded-lg transition-colors tooltip ${scale === 1 ? 'text-white/30 cursor-not-allowed' : 'text-white hover:text-sky-blue hover:bg-white/10'}`} 
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button onClick={handleResetZoom} className="p-2 text-white hover:text-sky-blue hover:bg-white/10 rounded-lg transition-colors" title="Reset Zoom">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div 
            ref={containerRef}
            className={`flex-1 w-full h-full overflow-hidden flex items-center justify-center ${isDragging ? 'cursor-grabbing' : (scale > 1 ? 'cursor-grab' : '')}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img 
              src={imageUrl} 
              alt="Scanned Paper"
              draggable={false}
              style={{ 
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
              className="max-w-full max-h-full object-contain pointer-events-none select-none drop-shadow-2xl" 
            />
          </div>
        </div>

        {/* ── RIGHT PANE: AI FEEDBACK (EDITABLE) ── */}
        <div className="w-full md:w-1/2 lg:w-5/12 flex flex-col bg-white overflow-y-auto min-h-0">
          <div className="p-6 sm:p-8 space-y-8 flex-1">
            
            {/* Student Name */}
            <div>
              <div className="flex items-center gap-2 mb-2 text-navy font-bold text-sm">
                <User className="w-4 h-4 text-sky-blue" />
                <label htmlFor="studentName">Detected Student Name</label>
              </div>
              <div className="relative group">
                <input 
                  id="studentName"
                  type="text" 
                  value={data.studentName}
                  onChange={(e) => handleChange('studentName', e.target.value)}
                  className="w-full text-lg font-semibold text-gray-900 border-b-2 border-transparent hover:border-gray-200 focus:border-sky-blue bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-blue/10 px-3 py-2 rounded-t-md transition-all pr-10"
                />
                <Edit3 className="w-4 h-4 text-gray-400 absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>

            {/* Score */}
            <div className="bg-sky-blue/5 rounded-2xl p-5 border border-sky-blue/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-navy font-bold text-sm">
                  <Award className="w-5 h-5 text-sky-blue" />
                  <label htmlFor="score">Final Score</label>
                </div>
                <div className="flex items-baseline gap-1 group relative">
                  <input
                    id="score"
                    type="number"
                    value={data.score}
                    onChange={(e) => handleChange('score', e.target.value ? Number(e.target.value) : 0)}
                    className="w-16 text-3xl font-black text-sky-blue bg-transparent border-b-2 border-transparent hover:border-sky-blue/30 focus:border-sky-blue focus:outline-none text-right transition-colors"
                  />
                  <span className="text-2xl font-bold text-navy/40">/</span>
                  <input
                    type="number"
                    value={data.maxScore}
                    onChange={(e) => handleChange('maxScore', e.target.value ? Number(e.target.value) : 0)}
                    className="w-12 text-2xl font-bold text-navy/40 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-gray-400 focus:outline-none text-left transition-colors"
                  />
                </div>
              </div>
               
               {/* Small progress bar visualization */}
               <div className="w-full bg-white rounded-full h-2.5 mt-4 overflow-hidden border border-gray-100">
                  <div 
                    className="bg-sky-blue h-full rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${Math.min(100, Math.max(0, (data.score / data.maxScore) * 100))}%` }}
                  />
               </div>
            </div>

            {/* Strengths */}
            <div>
              <div className="flex items-center gap-2 mb-2 text-green-700 font-bold text-sm">
                <label htmlFor="strengths">Strengths & Positive Feedback</label>
              </div>
              <textarea 
                id="strengths"
                rows={4}
                value={data.strengths}
                onChange={(e) => handleChange('strengths', e.target.value)}
                className="w-full text-gray-700 text-sm leading-relaxed border border-gray-200 hover:border-gray-300 focus:border-green-500 bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10 px-4 py-3 rounded-xl transition-all resize-none shadow-sm"
              />
            </div>

             {/* Improvements */}
             <div className="pb-10 md:pb-0">
              <div className="flex items-center gap-2 mb-2 text-amber-600 font-bold text-sm">
                <label htmlFor="improvements">Areas for Improvement</label>
              </div>
              <textarea 
                id="improvements"
                rows={5}
                value={data.improvements}
                onChange={(e) => handleChange('improvements', e.target.value)}
                className="w-full text-gray-700 text-sm leading-relaxed border border-gray-200 hover:border-gray-300 focus:border-amber-500 bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 px-4 py-3 rounded-xl transition-all resize-none shadow-sm"
              />
              
              {/* AI Macros generated from rubric errors */}
              {data.suggested_macros && data.suggested_macros.length > 0 && (
                <RubricMacros 
                  macros={data.suggested_macros} 
                  onMacroClick={handleAppendMacro} 
                />
              )}
            </div>
          </div>
        </div>
      </div>

       {/* MOBILE ACTION BAR (Fixed bottom for mobile, hidden on desktop) */}
       <div className="flex sm:hidden items-center justify-between gap-2 px-4 py-3 bg-white border-t border-gray-200 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] w-full">
          <div className="flex gap-2">
            <button 
              onClick={onFlag}
              className="p-2 rounded-lg border border-red-200 text-red-600 bg-red-50 active:bg-red-100 transition-colors"
              title="Flag as Illegible"
            >
              <Flag className="w-5 h-5" />
            </button>
            <button 
              onClick={onRegrade}
              className="p-2 rounded-lg border border-gray-300 text-gray-700 bg-white active:bg-gray-50 transition-colors shadow-sm"
              title="Request Regrade"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => onApprove(data)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white active:bg-green-700 transition-all shadow-md text-sm font-bold"
          >
            <Check className="w-5 h-5" /> Save
          </button>
        </div>
    </div>
  );
}
