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
  expected: string | null;
  detected: string | null;
  isCorrect: boolean;
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
    const { image } = body as { image: string };

    if (!image) {
      return Response.json(
        { error: "No image data provided." },
        { status: 400 }
      );
    }

    // Strip the data URL prefix if present
    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    const prompt = `You are an expert AI teacher grading a student's multiple-choice test or worksheet. Analyze this image.

First, look at the top of the paper (or anywhere on the first page) for a Student Name and a Subject. If you find them, extract them. If not, return null for those fields.

For each multiple-choice question you find in the image:
1. Read the question and its options.
2. Determine what the objectively correct answer should be based on your knowledge ("expected").
3. Detect which option the student selected/circled/filled ("detected").
4. Evaluate if the student is correct.

Return ONLY a JSON object with this exact structure (no markdown, no fences):
{
  "studentName": "John Doe",
  "subject": "Mathematics",
  "questions": [
    { "questionNumber": 1, "expected": "A", "detected": "A", "isCorrect": true, "confidence": 0.95 },
    { "questionNumber": 2, "expected": "C", "detected": "B", "isCorrect": false, "confidence": 0.90 }
  ],
  "totalDetected": 2,
  "notes": "observations about handwriting or image quality"
}

Rules:
- studentName and subject should be strings if found, otherwise null.
- expected and detected should be uppercase letters (A, B, C, D) or text if it's a short answer word. Use null if unclear.
- confidence is 0.0 to 1.0
- If no answer sheet or questions are visible return { "studentName": null, "subject": null, "questions": [], "totalDetected": 0, "notes": "No questions detected" }`;

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
      studentName: string | null;
      subject: string | null;
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

    const graded = parsed.questions;
    const correct = graded.filter((r) => r.isCorrect === true).length;

    return Response.json({
      studentName: parsed.studentName || null,
      subject: parsed.subject || null,
      results: graded,
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
