export interface Student {
  id: string;
  name: string;
}

export interface MatchResult {
  matchedStudentId: string | null;
  matchedStudentName: string | null;
  matchConfidence: number; // 0 to 100
  options: { student: Student; confidence: number }[]; // Keep the top choices for user verification
}

// Basic Levenshtein Distance algorithm to calculate string difference
function getLevenshteinDistance(a: string, b: string): number {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1,   // insertion
            matrix[i - 1][j] + 1    // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Convert Levenshtein Distance to a 0-100 percentage based on the max length of the two strings
function calculateConfidence(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 100;
  if (a.length === 0 || b.length === 0) return 0;
  
  const distance = getLevenshteinDistance(a.toLowerCase().trim(), b.toLowerCase().trim());
  const maxLength = Math.max(a.length, b.length);
  
  return Math.max(0, Math.round(((maxLength - distance) / maxLength) * 100));
}

/**
 * Normalizes both words and compares them. Specifically handles common OCR issues.
 */
export function matchStudent(extractedName: string | null, students: Student[]): MatchResult {
  if (!extractedName || extractedName.trim() === "" || students.length === 0) {
    return {
      matchedStudentId: null,
      matchedStudentName: null,
      matchConfidence: 0,
      options: []
    };
  }

  // Basic scrub to remove weird OCR punctuation around names
  const cleanExtracted = extractedName.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ").trim();

  const candidates = students.map(student => {
    // Basic scrub
    const cleanStudent = student.name.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ").trim();
    
    // First, try direct Levenshtein
    let confidence = calculateConfidence(cleanExtracted, cleanStudent);
    
    // Optional Enhancement: Try to match just first and last names if the extracted name is shorter (e.g. initial missed)
    const extParts = cleanExtracted.split(" ");
    const stuParts = cleanStudent.split(" ");
    
    if (extParts.length === 2 && stuParts.length === 3) {
        // e.g. "John Doe" vs "John H Doe"
        const firstLastCombo = `${stuParts[0]} ${stuParts[2]}`;
        const comboConf = calculateConfidence(cleanExtracted, firstLastCombo);
        if (comboConf > confidence) confidence = comboConf;
    }

    return { student, confidence };
  });

  // Sort highest confidence first
  candidates.sort((a, b) => b.confidence - a.confidence);

  const bestMatch = candidates[0];

  return {
    matchedStudentId: bestMatch ? bestMatch.student.id : null,
    matchedStudentName: bestMatch ? bestMatch.student.name : null,
    matchConfidence: bestMatch ? bestMatch.confidence : 0,
    options: candidates.slice(0, 5) // Return top 5 closest matches for the dropdown
  };
}
