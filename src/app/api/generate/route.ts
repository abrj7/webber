import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Initialize with the same pattern as the working Google AI Studio app
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const MODEL_NAME = 'gemini-2.5-flash';

export async function POST(req: Request) {
  try {
    const { image, type, prompt } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // Extract base64 data (remove the data:image/png;base64, prefix)
    const base64Data = image.split(',')[1] || image;

    const systemPrompt = `
      You are a WIREFRAME TO HTML CONVERTER. Your ONLY job is to replicate the EXACT visual layout from the input image.

      # ABSOLUTE RULES - DO NOT BREAK THESE:
      
      1. COPY THE LAYOUT EXACTLY
         - If the user drew a box at the top-left, put an element at top-left (top: 5%; left: 5%)
         - If there are 3 boxes in a row, create exactly 3 elements in a row
         - If something is centered, center it with margin: auto or flexbox
         - Count every shape and recreate ALL of them
         - DO NOT add extra elements that aren't in the drawing
         - DO NOT remove elements that ARE in the drawing

      2. MATCH SIZES PROPORTIONALLY
         - Small drawn box = small element (width: 15-25%)
         - Medium drawn box = medium element (width: 30-50%)  
         - Large drawn box = large element (width: 60-90%)
         - Full-width drawn line = full-width element (width: 100%)

      3. ELEMENT MAPPING
         - Any rectangle = <div> with border or background
         - Scribbles/wavy lines = Lorem ipsum text
         - Box with X inside = <img src="https://picsum.photos/400/300">
         - Circle = border-radius: 50% div or avatar
         - Hand-written text = Actual <p> or <h1> text (try to read what was written)

      4. USE THIS CSS STRUCTURE
         body { margin: 0; font-family: system-ui, sans-serif; }
         .container { width: 100vw; min-height: 100vh; position: relative; }
         Each element uses percentage-based width/height and positioning.

      5. COLORS
         - Background: white
         - Borders/accents: #005461 (teal) or #4988C4 (blue)
         - Text: #1a1a1a

      ## OUTPUT (JSON only, no markdown):
      {"html": "...", "css": "...", "js": ""}

      Website type: ${type}

      CRITICAL: Your job is NOT to design a beautiful website. Your job is to COPY the user's drawing into HTML/CSS as faithfully as possible. If it looks rough, that's OK - accuracy matters more than beauty.
    `;

    const parts: any[] = [
      { text: systemPrompt },
      { inlineData: { mimeType: "image/png", data: base64Data } }
    ];

    // Use the same API structure as the working Google AI Studio app
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts }]
    });

    const text = response.text || "";
    
    // Clean and parse the response
    try {
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const code = JSON.parse(cleanedText);
      return NextResponse.json(code);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      return NextResponse.json({ error: "Invalid AI response format", raw: text }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
