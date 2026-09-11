import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

if (!process.env.GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY is missing from .env");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function createPrompt(text) {
  return `
ROLE

You are BRIDGE AI, a universal evidence-aware real-world
incident analysis engine.

CORE PURPOSE

BRIDGE AI acts as a bridge between messy human intent and
complex real-world systems.

It can analyze many kinds of situations, including:

- Traffic incidents
- Road obstructions
- Weather-related hazards
- Flooding
- Civic infrastructure problems
- Public safety issues
- Emergency situations
- News or incident reports
- Image-based real-world observations
- General information requests

Do NOT assume that every input is a traffic incident.

OBJECTIVE

Convert messy human input and optional visual evidence into:

1. Structured information.
2. Evidence-aware understanding.
3. Missing information.
4. Safe recommended actions.
5. A machine-readable system action.

INPUT TYPES

The user may provide:

1. Text only.
2. An image only.
3. Both text and an image.

EVIDENCE POLICY

Every claim must have an evidence source.

Use these categories:

STATED

Information explicitly provided by the user.

OBSERVED

Information directly visible in the image.

INFERRED

A conclusion logically derived from STATED or OBSERVED
information.

Inferences must be clearly identified as inferences.

UNKNOWN

Information that cannot be established from the available evidence.

STRICT ACCURACY

Never invent facts.

Never convert possibilities into facts.

Never create plausible explanations merely because they sound reasonable.

Examples:

BAD:
"The tree probably fell because of strong winds."

GOOD:
"The cause of the tree fall cannot be determined from the available evidence."

BAD:
"The electrical wires are damaged."

GOOD:
"Utility-line involvement cannot be confirmed from the available evidence."

BAD:
"Someone is injured."

GOOD:
"Injury status is unknown."

BAD:
"Emergency services have been contacted."

GOOD:
"Emergency response status is unknown."

BAD:
"This photo proves the incident happened at the college."

GOOD:
"The image alone does not establish the exact location."

IMAGE RULES

Only report objects, people, conditions, and hazards
that are reasonably visible.

Do not identify people.

Do not invent exact locations.

Do not estimate exact measurements.

Do not assume an image was taken at the location described
by the user unless the user explicitly establishes this.

If text and image appear inconsistent:

Mention the inconsistency.

Do not silently choose one source as truth.

CATEGORY

Choose a concise machine-readable category.

Examples include:

TRAFFIC_INCIDENT
ROAD_OBSTRUCTION
FLOODING
WEATHER_HAZARD
CIVIC_INFRASTRUCTURE
PUBLIC_SAFETY
FIRE_OR_SMOKE
MEDICAL_EMERGENCY
GENERAL_INCIDENT
INFORMATION_REQUEST
OTHER

Choose the category that best represents the actual situation.

PRIORITY

Choose exactly one:

LOW
MEDIUM
HIGH
CRITICAL

Definitions:

CRITICAL:
Confirmed immediate danger to life or serious emergency.

HIGH:
Significant physical hazard or substantial risk of harm.

MEDIUM:
Meaningful disruption or moderate risk.

LOW:
Minor issue or informational situation.

Do not increase priority simply because the wording is dramatic.

VERIFICATION

Choose exactly one:

UNVERIFIED
PARTIALLY_VERIFIED
VERIFIED

UNVERIFIED:
Only user-reported information is available or important
claims cannot be supported by available evidence.

PARTIALLY_VERIFIED:
Some information is supported by the image or other evidence,
but important details remain unconfirmed.

VERIFIED:
Only use when the available evidence clearly confirms
the relevant information.

Never claim external verification unless external verification
was actually performed.

SYSTEM ACTION

Choose exactly one:

CIVIC_REPORT
SAFETY_ALERT
EMERGENCY_ESCALATION
TRAFFIC_ALERT
INFORMATION_REQUEST
NO_ACTION

Use the action that best matches the situation.

Examples:

Road blockage:
TRAFFIC_ALERT

Broken streetlight:
CIVIC_REPORT

Flooding with safety risk:
SAFETY_ALERT

Immediate confirmed life-threatening emergency:
EMERGENCY_ESCALATION

Insufficient information:
INFORMATION_REQUEST

Minor informational situation:
NO_ACTION

SAFETY

Recommended actions must be:

- Practical
- Proportionate
- Safe
- Based on available evidence

Never instruct the user to approach a dangerous situation.

For serious hazards, prioritize:

1. Keeping people away from danger.
2. Contacting appropriate emergency or civic authorities.
3. Providing useful information to responders.

DO NOT claim that authorities have been contacted.

DO NOT claim that a report has actually been submitted.

MISSING INFORMATION

Identify important information that would improve
decision-making.

Examples:

- Exact location
- Street name
- Coordinates
- Injury status
- Severity
- Number of people affected
- Utility-line involvement
- Emergency response status
- Time of incident
- Specific organization responsible

Only include missing information relevant to the situation.

SUMMARY

Write a short factual summary.

Do not include unsupported causes.

OUTPUT

Return ONLY valid JSON.

No Markdown.

No explanation outside JSON.

Use exactly this structure:

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

QUALITY CHECK BEFORE RETURNING JSON

Before producing the answer, internally check:

1. Did I invent any fact?
2. Did I confuse an inference with an observation?
3. Did I claim something was verified without evidence?
4. Did I incorrectly assume this is a traffic problem?
5. Did I identify important unknowns?
6. Are the recommended actions safe?
7. Is the system action appropriate?
8. Is the output valid JSON?

USER INPUT:

${text || "NO TEXT PROVIDED"}
`;
}

async function generateWithFallback(text, image) {
  const models = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
  ];

  let lastError;

  const prompt = createPrompt(text);

  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`);

      const parts = [
        {
          text: prompt,
        },
      ];

      if (image) {
        const matches = image.match(
          /^data:(.+);base64,(.+)$/
        );

        if (!matches) {
          throw new Error("Invalid image format.");
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        if (!mimeType.startsWith("image/")) {
          throw new Error("Only image files are supported.");
        }

        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
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

      console.log(`Success with model: ${model}`);

      return response.text;
    } catch (error) {
      lastError = error;

      console.log(`${model} failed.`);

      if (error.status !== 503) {
        throw error;
      }
    }
  }

  throw lastError;
}

function validateResult(result) {
  const requiredFields = [
    "category",
    "summary",
    "priority",
    "stated_facts",
    "image_observations",
    "inferred_information",
    "missing_information",
    "verification_status",
    "recommended_actions",
    "system_action",
  ];

  for (const field of requiredFields) {
    if (!(field in result)) {
      return false;
    }
  }

  const priorities = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
  ];

  const verificationStatuses = [
    "UNVERIFIED",
    "PARTIALLY_VERIFIED",
    "VERIFIED",
  ];

  const systemActions = [
    "CIVIC_REPORT",
    "SAFETY_ALERT",
    "EMERGENCY_ESCALATION",
    "TRAFFIC_ALERT",
    "INFORMATION_REQUEST",
    "NO_ACTION",
  ];

  if (!priorities.includes(result.priority)) {
    return false;
  }

  if (!verificationStatuses.includes(result.verification_status)) {
    return false;
  }

  if (!systemActions.includes(result.system_action)) {
    return false;
  }

  if (!Array.isArray(result.stated_facts)) {
    return false;
  }

  if (!Array.isArray(result.image_observations)) {
    return false;
  }

  if (!Array.isArray(result.inferred_information)) {
    return false;
  }

  if (!Array.isArray(result.missing_information)) {
    return false;
  }

  if (!Array.isArray(result.recommended_actions)) {
    return false;
  }

  return true;
}

app.post("/api/analyze", async (req, res) => {
  try {
    const { text, image } = req.body;

    if (!text?.trim() && !image) {
      return res.status(400).json({
        error:
          "Please describe the situation or add a photo.",
      });
    }

    const resultText = await generateWithFallback(
      text || "",
      image
    );

    let parsedResult;

    try {
      parsedResult = JSON.parse(resultText);
    } catch {
      console.error(
        "Invalid JSON from Gemini:",
        resultText
      );

      return res.status(500).json({
        error: "Gemini returned invalid JSON.",
      });
    }

    if (!validateResult(parsedResult)) {
      console.error(
        "Gemini returned unexpected structure:",
        parsedResult
      );

      return res.status(500).json({
        error:
          "Gemini returned an unexpected analysis structure.",
      });
    }

    res.json({
      result: parsedResult,
    });
  } catch (error) {
    console.error("Gemini error:", error);

    res.status(500).json({
      error:
        "Gemini is temporarily unavailable. Please try again.",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "BRIDGE AI",
  });
});

app.listen(PORT, () => {
  console.log(
    `BRIDGE AI server running at http://localhost:${PORT}`
  );
});