import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL_NAME = 'gemini-2.5-flash';

// ==================== STYLE-SPECIFIC EDITING RULES ====================

function getStyleEditingRules(style: string): string {
  const rules: Record<string, string> = {
    modern: `Keep clean lines, subtle shadows, generous whitespace. Use smooth transitions (0.3s ease).`,
    minimalistic: `Maximize whitespace, use minimal colors. No gradients or animations. Keep it ultra-clean.`,
    retro: `Use sharp corners, offset shadows, monospace fonts. Think 80s/90s computing aesthetic.`,
    dynamic: `Use rounded corners, bouncy animations, vibrant colors. Keep it playful and energetic.`,
    glassmorphism: `Use backdrop-filter blur effects, semi-transparent backgrounds, subtle borders.`,
    brutalist: `Sharp corners, bold borders, high contrast. Raw, typography-heavy aesthetic.`
  };
  return rules[style] || rules.modern;
}

export async function POST(req: Request) {
  try {
    const { message, currentHtml, style, backgroundColor, accentColor } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!currentHtml) {
      return NextResponse.json({ error: "No website to edit. Generate a website first!" }, { status: 400 });
    }

    const finalStyle = style || 'modern';
    const finalBgColor = backgroundColor || '#ffffff';
    const finalAccentColor = accentColor || '#3b82f6';

    const systemPrompt = `
You are an EXPERT WEBSITE EDITOR AI. The user has a generated website and wants to make changes via natural language.

## CURRENT WEBSITE CODE:
${currentHtml}

## ACTIVE DESIGN SYSTEM:

**STYLE:** ${finalStyle}
**BACKGROUND COLOR:** ${finalBgColor}
**ACCENT COLOR:** ${finalAccentColor}

Style Guidelines: ${getStyleEditingRules(finalStyle)}

## COLOR PALETTE (MUST MAINTAIN):
- Background: ${finalBgColor}
- Accent/CTAs: ${finalAccentColor}
- All edits must stay within this color palette

## USER'S EDIT REQUEST:
"${message}"

## EDITING RULES:

1. **Preserve the Design System**: All changes must match the "${finalStyle}" aesthetic
2. **Color Consistency**: Only use ${finalBgColor}, ${finalAccentColor}, and their variations
3. **Minimal Changes**: Only modify what the user explicitly requests
4. **Maintain Structure**: Keep existing layout unless asked to change it
5. **Quality First**: Ensure responsive design and accessibility are maintained

## INTERPRETATION GUIDE:

Common requests and how to handle them:
- "Make it bigger/smaller" → Adjust font-size, padding, or element dimensions
- "Change color to X" → Update the specific element while maintaining palette harmony
- "Add a button" → Use accent color, match existing button styles
- "More spacing" → Increase padding/margins following the style's spacing rules
- "Make it pop" → Add subtle animations, shadows, or increase contrast
- "Center it" → Use flexbox or text-align as appropriate
- "Add an image" → Use placeholder images from picsum or unsplash

## OUTPUT FORMAT (JSON only, NO markdown backticks):
{
  "html": "BODY CONTENT ONLY - semantic HTML5. NO DOCTYPE, html, head, or body tags.",
  "css": "Complete updated CSS maintaining the style system",
  "js": "JavaScript if needed (usually empty string)",
  "changes": "Brief description of what was changed"
}

CRITICAL REMINDERS:
- The "html" field must contain ONLY body content, NOT a full HTML document
- Maintain the "${finalStyle}" style throughout all changes
- Use ${finalAccentColor} for any new CTAs, links, or highlights
- Keep ${finalBgColor} as the primary background
`;

    console.log(`✏️ Editing website: "${message.substring(0, 50)}..." | Style: ${finalStyle}`);

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: systemPrompt }] }]
    });

    const text = response.text || "";
    
    console.log("📝 Edit response (first 300 chars):", text.substring(0, 300));
    
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
      
      console.log("✅ Edit applied:", code.changes || "Changes made");
      
      return NextResponse.json(code);
    } catch (parseError) {
      console.error("❌ Failed to parse chat response:", text.substring(0, 500));
      return NextResponse.json({ 
        error: "Failed to apply changes. Try rephrasing your request.",
        raw: text.substring(0, 500)
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
