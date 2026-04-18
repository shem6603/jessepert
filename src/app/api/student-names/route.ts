import { NextRequest } from "next/server";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

type ExtractedName = { name: string; confidence: number };

function parseDataUrl(image: string): { base64Data: string; mimeType: string } {
  const match = image.match(/^data:(.+?);base64,(.*)$/);
  if (match) return { mimeType: match[1], base64Data: match[2] };
  return { mimeType: "image/jpeg", base64Data: image.includes(",") ? image.split(",")[1] : image };
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

    const body = (await request.json()) as { image?: string };
    if (!body.image) {
      return Response.json({ error: "No image data provided." }, { status: 400 });
    }

    const { base64Data, mimeType } = parseDataUrl(body.image);

    const prompt = `You are extracting a roster from a photo.

Task: Read the image and extract ONLY the student names that are actually visible (handwritten or printed).

Return ONLY a JSON object with this exact shape (no markdown, no fences):
{
  "names": [
    { "name": "First Last", "confidence": 0.93 }
  ],
  "notes": "brief notes about image quality or ambiguities"
}

Rules:
- Do NOT invent names.
- Prefer "First Last" format when possible.
- Remove duplicates (case-insensitive).
- confidence must be between 0.0 and 1.0.
- If no names are visible, return { "names": [], "notes": "No names detected" }.`;

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
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
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
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed: { names: ExtractedName[]; notes: string };
    try {
      const cleanedText = rawText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      parsed = JSON.parse(cleanedText);
    } catch {
      console.error("Failed to parse Gemini response:", rawText);
      return Response.json(
        { error: "Failed to parse AI response. Try a clearer image.", rawResponse: rawText },
        { status: 422 }
      );
    }

    const uniqueByLower = new Map<string, ExtractedName>();
    for (const entry of parsed.names ?? []) {
      const name = (entry?.name ?? "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const confidence = Number.isFinite(entry.confidence) ? entry.confidence : 0;
      const existing = uniqueByLower.get(key);
      if (!existing || confidence > existing.confidence) {
        uniqueByLower.set(key, { name, confidence: Math.max(0, Math.min(1, confidence)) });
      }
    }

    return Response.json({
      names: Array.from(uniqueByLower.values()).sort((a, b) => b.confidence - a.confidence),
      notes: parsed.notes ?? "",
    });
  } catch (err) {
    console.error("Student names API error:", err);
    return Response.json(
      { error: "Internal server error during name extraction." },
      { status: 500 }
    );
  }
}

