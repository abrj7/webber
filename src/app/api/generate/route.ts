import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Initialize with @google/genai SDK (matching Google AI Studio pattern)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const MODEL_NAME = 'gemini-2.5-flash';

export async function POST(req: Request) {
  try {
    const { image, style, backgroundColor, accentColor } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // Extract base64 data (remove the data:image/png;base64, prefix)
    const base64Data = image.split(',')[1] || image;

    // Style descriptions for each preset
    const styleDescriptions: Record<string, string> = {
      modern: 'Clean lines, subtle shadows, professional look. Use modern typography, soft rounded corners, and refined spacing.',
      minimalistic: 'Simple and clean with lots of whitespace. Only essential elements, no decorative elements. Light and airy feel.',
      dynamic: 'Bold and eye-catching. Use gradients, animations (CSS transitions), vibrant colors, and strong visual hierarchy.',
      retro: '80s/90s vibes with vintage colors (warm oranges, teals, purples). Pixelated borders, old-school fonts, nostalgic feel.',
      glassmorphism: 'Frosted glass effects with backdrop-blur, semi-transparent backgrounds, subtle borders, and modern layered depth.',
      brutalist: 'Raw and unconventional. Bold typography, stark contrasts, asymmetric layouts, thick borders, no rounded corners.',
    };

    const styleGuide = styleDescriptions[style as string] || styleDescriptions.modern;

    const systemPrompt = `
      You are a SMART WIREFRAME INTERPRETER. Your job is to understand the user's intent from their wireframe drawing and create a polished website that matches their vision.

      # HOW TO INTERPRET THE WIREFRAME:

      ## 1. RED TEXT = ANNOTATIONS (Context, NOT literal text)
         - Red/reddish colored text is the user DESCRIBING what something should be
         - Example: A rectangle with red text "image of cat" = generate an <img> of a cat
         - Example: A box with red text "hero section" = create a proper hero section
         - Example: Red text "navbar" near rectangles = those rectangles are navigation links
         - DO NOT put red annotation text on the actual website - use it to understand intent

      ## 2. NON-RED TEXT = ACTUAL CONTENT
         - Black, blue, or other colored text should appear on the website
         - This is the actual content the user wants displayed
         - Example: Black text "Welcome" = put "Welcome" as a heading

      ## 3. INTELLIGENT SHAPE INTERPRETATION
         - Rectangle/Box = Default to an image placeholder (use https://picsum.photos/WIDTH/HEIGHT)
         - Box with "button" written inside = Create a styled <button>
         - Box with "nav" or near top = Navigation bar
         - Box with X inside = Definitely an image placeholder
         - Circle = Avatar, icon, or rounded element
         - Horizontal lines/scribbles = Text paragraphs (use appropriate Lorem ipsum)
         - Multiple small boxes in a row = Card grid, gallery, or feature list

      ## 4. FOLLOW THE LAYOUT
         - Respect the position of elements (top, middle, bottom, left, right, center)
         - Respect relative sizes (small, medium, large elements)
         - Respect groupings (elements drawn close together are related)
         - If 3 boxes are drawn, create 3 elements (not more, not less)

      ## 5. STYLING (USER SELECTED)
         Style: ${style || 'modern'}
         ${styleGuide}
         
         Colors to use:
         - Background color: ${backgroundColor || '#ffffff'}
         - Accent/Primary color: ${accentColor || '#3b82f6'}
         - Text: Use appropriate contrasting colors based on the background
         
         Apply these colors consistently throughout the design.

      ## 6. IMAGE GENERATION
         - For rectangles meant to be images, use: https://picsum.photos/WIDTH/HEIGHT
         - If red annotation describes the image (e.g., "cat photo"), add relevant alt text
         - Size images proportionally to the drawn rectangle

      ## OUTPUT FORMAT (JSON only, no markdown):
      {
        "html": "BODY CONTENT ONLY - no DOCTYPE, html, head, or body tags. Just the inner content.",
        "css": "All CSS styles",
        "js": "Any JavaScript if needed",
        "analysis": {
          "annotations": ["list of red annotation texts you found and how you interpreted them"],
          "layout": "brief description of the layout structure (e.g., 'header on top, 3-column grid below, footer at bottom')",
          "elements": ["list of elements you created (e.g., 'navbar', 'hero image', 'call-to-action button', 'feature cards')"]
        }
      }

      IMPORTANT: 
      - The "html" field must contain ONLY the body content (divs, sections, etc.) - NOT a full HTML document
      - Think like a designer interpreting a client's rough sketch
      - Create a real, polished website using the style and colors they selected
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
    
    console.log("Raw Gemini response:", text.substring(0, 500)); // Log first 500 chars for debugging
    
    // Clean and parse the response
    try {
      // Remove markdown code blocks if present
      let cleanedText = text
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      
      // Try to extract JSON object if it's wrapped in other text
      const jsonMatch = cleanedText.match(/\{[\s\S]*"html"[\s\S]*"css"[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
      
      const code = JSON.parse(cleanedText);
      return NextResponse.json(code);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      
      // Try one more approach: look for JSON anywhere in the response
      try {
        const fallbackMatch = text.match(/\{[\s\S]*?"html"\s*:\s*"[\s\S]*?"[\s\S]*?"css"\s*:\s*"[\s\S]*?"[\s\S]*?\}/);
        if (fallbackMatch) {
          const code = JSON.parse(fallbackMatch[0]);
          return NextResponse.json(code);
        }
      } catch (e) {
        // Ignore fallback parsing error
      }
      
      return NextResponse.json({ 
        error: "Invalid AI response format. The AI may have returned malformed JSON.", 
        raw: text.substring(0, 1000) // Include first 1000 chars of raw response for debugging
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
