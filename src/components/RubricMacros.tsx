import React from 'react';
import { Sparkles, Plus } from 'lucide-react';

interface RubricMacrosProps {
  macros: string[];
  onMacroClick: (macro: string) => void;
}

export function RubricMacros({ macros, onMacroClick }: RubricMacrosProps) {
  if (!macros || macros.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-sky-blue flex items-center gap-1 mr-1">
          <Sparkles className="w-3.5 h-3.5" /> AI Suggestions:
        </span>
        {macros.map((macro, index) => (
          <button
            key={index}
            onClick={() => onMacroClick(macro)}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-sky-blue/40 hover:bg-sky-blue/5 text-xs font-medium text-gray-600 hover:text-sky-blue transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-blue/20"
            title={`Append to feedback: "${macro}"`}
          >
            {macro}
            <Plus className="w-3 h-3 text-gray-400 group-hover:text-sky-blue transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
