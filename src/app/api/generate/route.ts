import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL_NAME = 'gemini-2.5-flash';

// Compact style rules
function getCompactStyleRules(style: string): string {
  const rules: Record<string, string> = {
    modern: 'Clean sans-serif, 0.5-1rem radius, soft shadows, smooth transitions, gradient accents',
    minimalist: 'Max whitespace (8rem padding), sharp corners, no shadows, outlined buttons, <5% accent usage',
    retro: 'Monospace/serif mix, 0 radius, bold offset shadows (4px 4px), thick borders (3px), flat colors, 80s aesthetic',
    playful: 'Rounded fonts (Poppins), 1.5-3rem radius, bright gradients, bouncy hover (scale 1.05), emoji icons',
    professional: 'Serif headings, conservative radius (0.25rem), subtle shadows, structured grid, trust indicators',
    brutalist: 'Heavy sans-serif, 0 radius, no transitions, asymmetric layout, high contrast, raw aesthetic, huge bold text'
  };
  return rules[style] || rules.modern;
}

function getTextColor(bg: string): string {
  const hex = bg.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1f2937' : '#f9fafb';
}

export async function POST(req: Request) {
  try {
    const { image, style, backgroundColor, accentColor, currentHtml } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    let systemPrompt = "";

    if (currentHtml) {
      // INCREMENTAL UPDATE PROMPT (Regenerate mode)
      systemPrompt = `
You are an expert website generator. The user has UPDATED their sketch. 
YOUR TASK: Update the existing website code to match the new sketch.

## EXISTING CODE:
${currentHtml}

## DESIGN CONSTRAINTS:
Style: ${style}
Background: ${backgroundColor}
Accent: ${accentColor}

## STYLE RULES:
${getCompactStyleRules(style)}

## UPDATE STRATEGY:
1. Compare the new sketch with the previous design.
2. Only add, remove, or modify elements that have changed in the sketch.
3. Preserve existing styles and structure where they still match the sketch.
4. BE FAST. Only generate the necessary changes while maintaining a complete valid output.
5. IMPORTANT: You MUST return the COMPLETE CSS for the entire page in the 'css' field, including any styles preserved from the existing code. Do not return empty CSS.

## OUTPUT (JSON, no markdown):
{
  "html": "updated body content only",
  "css": "THE COMPLETE UPDATED CSS FOR THE ENTIRE PAGE",
  "js": "minimal if needed"
}
`;
    } else {
      // INITIAL GENERATION PROMPT
      systemPrompt = `
You are an expert website generator. Create a stunning, professional website from the user's sketch.

## DESIGN CONSTRAINTS:
Style: ${style}
Background: ${backgroundColor}
Accent: ${accentColor}

## STYLE RULES:
${getCompactStyleRules(style)}

## COLOR USAGE:
- Dominant (60%): ${backgroundColor}
- Accent (10%): ${accentColor} for CTAs, links, highlights
- Neutral (30%): Grays for text, borders, cards
- Text: ${getTextColor(backgroundColor)}

## QUALITY REQUIREMENTS:
- Modern CSS: flexbox/grid, proper spacing
- Typography: clear hierarchy (h1: 3.5rem, p: 1.125rem)
- Responsive: mobile breakpoints at 768px
- Semantic HTML5: <header>, <main>, <section>, <footer>

## OUTPUT (JSON, no markdown):
{
  "html": "body content only, no DOCTYPE/html/head/body tags",
  "css": "complete CSS with variables, responsive, hover states",
  "js": "minimal if needed"
}
`;
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const parts = [
      { text: systemPrompt },
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Data
        }
      }
    ];

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts }]
    });

    const text = response.text || "";

    try {
      let cleanedText = text
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      const jsonMatch = cleanedText.match(/\{[\s\S]*"html"[\s\S]*"css"[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      const code = JSON.parse(cleanedText);
      return NextResponse.json(code);
    } catch (parseError) {
      console.error("Failed to parse AI response:", text);
      return NextResponse.json({
        error: "Invalid AI response format. Please try again.",
        raw: text.substring(0, 1000)
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
