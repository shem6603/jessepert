import { NextRequest } from "next/server";

/* ────────────────────────────────────────────────────────────
   POST /api/scan
   Accepts { image: string (base64 JPEG), answerKey: Record<string,string> }
   Sends image to Gemini Vision and returns graded results.
   ──────────────────────────────────────────────────────────── */

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface DetectedQuestion {
  questionNumber: number;
  detectedAnswer: string | null;
  confidence: number;
}

interface GradedResult {
  questionId: string;
  questionNumber: number;
  expectedAnswer: string;
  detectedAnswer: string | null;
  isCorrect: boolean | null;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { image, answerKey } = body as {
      image: string;
      answerKey: Record<string, string>;
    };

    if (!image) {
      return Response.json(
        { error: "No image data provided." },
        { status: 400 }
      );
    }

    if (!answerKey || Object.keys(answerKey).length === 0) {
      return Response.json(
        { error: "No answer key provided." },
        { status: 400 }
      );
    }

    // Strip the data URL prefix if present (e.g. "data:image/jpeg;base64,")
    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    const totalQuestions = Object.keys(answerKey).length;

    // Build the Gemini prompt
    const prompt = `You are an expert Optical Mark Recognition (OMR) system. Analyze this image of a multiple-choice answer sheet.

Detect which bubbles are filled in for each question. The answer sheet may contain up to ${totalQuestions} questions, each with options labeled A, B, C, D (and possibly E).

Return your analysis as a JSON object with this exact structure (no markdown, no code fences, just raw JSON):
{
  "questions": [
    { "questionNumber": 1, "detectedAnswer": "A", "confidence": 0.95 },
    { "questionNumber": 2, "detectedAnswer": "B", "confidence": 0.90 },
    { "questionNumber": 3, "detectedAnswer": null, "confidence": 0.0 }
  ],
  "totalDetected": 3,
  "notes": "Any observations about image quality or detection issues"
}

Rules:
- questionNumber starts at 1
- detectedAnswer should be uppercase (A, B, C, D, E) or null if no bubble is clearly filled
- confidence is 0.0 to 1.0
- If you cannot detect any answer sheet or bubbles in the image, return: { "questions": [], "totalDetected": 0, "notes": "explanation" }
- Only return the JSON object, nothing else`;

    // Call Gemini Vision API
    const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      return Response.json(
        { error: `Gemini API error: ${geminiResponse.status}` },
        { status: 502 }
      );
    }

    const geminiData = await geminiResponse.json();

    // Extract the text response from Gemini
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Parse the JSON from Gemini's response (strip any accidental markdown fences)
    let parsed: { questions: DetectedQuestion[]; totalDetected: number; notes: string };
    try {
      const cleanedText = rawText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(cleanedText);
    } catch {
      console.error("Failed to parse Gemini response:", rawText);
      return Response.json(
        {
          error: "Failed to parse AI response. Try capturing a clearer image.",
          rawResponse: rawText,
        },
        { status: 422 }
      );
    }

    // Grade the results against the answer key
    const gradedResults: GradedResult[] = parsed.questions.map((q) => {
      const questionId = `q${q.questionNumber}`;
      const expectedAnswer = answerKey[questionId] ?? null;
      const detected = q.detectedAnswer?.toLowerCase() ?? null;

      return {
        questionId,
        questionNumber: q.questionNumber,
        expectedAnswer: expectedAnswer ?? "",
        detectedAnswer: detected,
        isCorrect:
          detected && expectedAnswer
            ? detected === expectedAnswer.toLowerCase()
            : null,
        confidence: q.confidence,
      };
    });

    const correctCount = gradedResults.filter((r) => r.isCorrect === true).length;
    const totalGraded = gradedResults.filter((r) => r.isCorrect !== null).length;

    return Response.json({
      results: gradedResults,
      summary: {
        totalDetected: parsed.totalDetected,
        totalGraded,
        correctCount,
        incorrectCount: totalGraded - correctCount,
        score: totalGraded > 0 ? Math.round((correctCount / totalGraded) * 100) : 0,
      },
      notes: parsed.notes,
    });
  } catch (err) {
    console.error("Scan API error:", err);
    return Response.json(
      { error: "Internal server error during scan processing." },
      { status: 500 }
    );
  }
}
