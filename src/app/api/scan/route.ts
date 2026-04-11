import { NextRequest } from "next/server";

/* ────────────────────────────────────────────────────────────
   POST /api/scan
   Accepts { image: string (base64 JPEG), answerKey: Record<string,string> }
   Sends image to Gemini Vision, detects answers, grades them.
   Returns per-question results with correct/incorrect status.
   ──────────────────────────────────────────────────────────── */

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface DetectedQuestion {
  questionNumber: number;
  detectedAnswer: string | null;
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

    // Strip the data URL prefix if present
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const totalQuestions = Object.keys(answerKey).length;

    const prompt = `You are an expert OMR (Optical Mark Recognition) system. Analyze this image of a multiple-choice answer sheet.

Detect which bubbles are filled for each question. There may be up to ${totalQuestions} questions with options A, B, C, D (possibly E).

Return ONLY a JSON object with this exact structure (no markdown, no fences):
{
  "questions": [
    { "questionNumber": 1, "detectedAnswer": "A", "confidence": 0.95 },
    { "questionNumber": 2, "detectedAnswer": null, "confidence": 0.0 }
  ],
  "totalDetected": 2,
  "notes": "observations"
}

Rules:
- detectedAnswer is uppercase A-E or null if unclear
- confidence is 0.0 to 1.0
- If no answer sheet is visible return { "questions": [], "totalDetected": 0, "notes": "No answer sheet detected" }`;

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
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed: {
      questions: DetectedQuestion[];
      totalDetected: number;
      notes: string;
    };
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
          error: "Failed to parse AI response. Try a clearer image.",
          rawResponse: rawText,
        },
        { status: 422 }
      );
    }

    // Grade each question
    const results = parsed.questions.map((q) => {
      const key = `q${q.questionNumber}`;
      const expected = answerKey[key]?.toUpperCase() ?? null;
      const detected = q.detectedAnswer?.toUpperCase() ?? null;

      return {
        questionNumber: q.questionNumber,
        expected,
        detected,
        isCorrect:
          detected && expected ? detected === expected : null,
        confidence: q.confidence,
      };
    });

    const graded = results.filter((r) => r.isCorrect !== null);
    const correct = graded.filter((r) => r.isCorrect === true).length;

    return Response.json({
      results,
      summary: {
        totalDetected: parsed.totalDetected,
        totalGraded: graded.length,
        correct,
        incorrect: graded.length - correct,
        score:
          graded.length > 0
            ? Math.round((correct / graded.length) * 100)
            : 0,
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
