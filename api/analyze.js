import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const models = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
];

function createPrompt(text) {
  return `
You are BRIDGE AI, an evidence-aware real-world incident analysis engine.

Convert messy human input and optional image evidence into structured,
actionable information.

STRICT RULES:
- Never invent facts.
- Separate user-stated facts from image observations.
- Clearly identify inferences.
- Unknown information must remain unknown.
- Never claim external verification unless it actually happened.
- Do not identify people.
- Do not invent exact locations.
- Give safe, practical recommendations.

PRIORITY:
CRITICAL = confirmed immediate danger to life.
HIGH = significant physical hazard or substantial risk.
MEDIUM = meaningful disruption or moderate risk.
LOW = minor or informational.

VERIFICATION:
UNVERIFIED
PARTIALLY_VERIFIED
VERIFIED

Return ONLY valid JSON.

Use exactly:

{
  "category": "string",
  "summary": "string",
  "priority": "LOW | MEDIUM | HIGH | CRITICAL",
  "stated_facts": [],
  "image_observations": [],
  "inferred_information": [],
  "missing_information": [],
  "verification_status": "UNVERIFIED | PARTIALLY_VERIFIED | VERIFIED",
  "recommended_actions": [],
  "system_action": "CIVIC_REPORT | SAFETY_ALERT | EMERGENCY_ESCALATION | TRAFFIC_ALERT | INFORMATION_REQUEST | NO_ACTION"
}

USER INPUT:
${text || "NO TEXT PROVIDED"}
`;
}

async function generate(text, image) {
  let lastError;

  for (const model of models) {
    try {
      const parts = [
        {
          text: createPrompt(text),
        },
      ];

      if (image) {
        const match = image.match(/^data:(.+);base64,(.+)$/);

        if (!match) {
          throw new Error("Invalid image format.");
        }

        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      return JSON.parse(response.text);
    } catch (error) {
      lastError = error;

      if (error.status !== 503) {
        throw error;
      }
    }
  }

  throw lastError;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { text, image } = req.body || {};

    if (!text?.trim() && !image) {
      return res.status(400).json({
        error: "Please describe the situation or add a photo.",
      });
    }

    const result = await generate(text || "", image);

    return res.status(200).json({
      result,
    });
  } catch (error) {
    console.error("BRIDGE AI API error:", error);

    return res.status(500).json({
      error: "Gemini is temporarily unavailable. Please try again.",
    });
  }
}