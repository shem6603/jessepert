import React, { useState } from 'react';
import { UserCheck, AlertTriangle, UserPlus, ChevronDown } from 'lucide-react';
import { Student, MatchResult } from '@/lib/matchStudent';

interface StudentMatchBadgeProps {
  matchResult: MatchResult | null;
  allStudents?: Student[]; // Provide this when fallback lookup is needed
  onConfirmMatch: (studentId: string, studentName: string) => void;
}

export function StudentMatchBadge({ matchResult, allStudents = [], onConfirmMatch }: StudentMatchBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // No match result scenario (before processing or full failure)
  if (!matchResult) return null;

  const { matchConfidence, matchedStudentName, options } = matchResult;

  const handleSelect = (student: Student) => {
    setIsOpen(false);
    onConfirmMatch(student.id, student.name);
  };

  // State 1: High Confidence (> 85%)
  if (matchConfidence > 85 && matchedStudentName) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50/80 border border-green-200 text-green-700 text-xs font-semibold shadow-sm">
        <UserCheck className="w-3.5 h-3.5" />
        Assigned to {matchedStudentName}
      </div>
    );
  }

  // State 2: Medium Confidence (40% - 85%) - Requires Verification
  if (matchConfidence >= 40 && matchConfidence <= 85) {
    return (
      <div className="relative inline-block text-left">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50/80 border border-amber-200 text-amber-700 text-xs font-semibold shadow-sm hover:bg-amber-100 transition-colors"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Verify Match: {matchedStudentName}?
          <ChevronDown className="w-3 h-3 ml-1" />
        </button>

        {isOpen && (
          <div className="absolute left-0 z-50 mt-1 w-64 origin-top-left rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1 px-2">
              <span className="block px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Closest Matches</span>
              <div className="max-h-48 overflow-y-auto">
                {options.map((opt) => (
                  <button
                    key={opt.student.id}
                    onClick={() => handleSelect(opt.student)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-sky-blue/10 hover:text-sky-blue rounded-md transition-colors flex justify-between items-center"
                  >
                    <span className="font-medium">{opt.student.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{opt.confidence}% match</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // State 3: Low Confidence (< 40%) or Completely Null
  const availableStudents = allStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50/80 border border-red-200 text-red-700 text-xs font-semibold shadow-sm hover:bg-red-100 transition-colors"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Assign Student
        <ChevronDown className="w-3 h-3 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 w-64 origin-top-left rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none flex flex-col">
          <div className="p-2 border-b border-gray-100">
             <input 
               type="text" 
               placeholder="Search students..." 
               className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-blue"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          <div className="py-1 px-2 max-h-48 overflow-y-auto">
            {availableStudents.length === 0 ? (
              <span className="block px-2 py-3 text-xs text-center text-gray-400 italic">No students found.</span>
            ) : (
              availableStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => handleSelect(student)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-sky-blue/10 hover:text-sky-blue rounded-md transition-colors"
                >
                  {student.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
