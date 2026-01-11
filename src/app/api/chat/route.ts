import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const MODEL_NAME = 'gemini-2.5-flash';

export async function POST(req: Request) {
  try {
    const { message, currentHtml, style, backgroundColor, accentColor } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!currentHtml) {
      return NextResponse.json({ error: "No website to edit. Generate a website first!" }, { status: 400 });
    }

    const systemPrompt = `
      You are a WEBSITE EDITOR AI. The user has a generated website and wants to make changes to it via natural language commands.

      ## CURRENT WEBSITE CODE:
      ${currentHtml}

      ## STYLING CONTEXT:
      - Style: ${style || 'modern'}
      - Background color: ${backgroundColor || '#ffffff'}
      - Accent color: ${accentColor || '#3b82f6'}

      ## YOUR TASK:
      The user will describe changes they want to make. Apply these changes to the website and return the updated code.

      ## RULES:
      1. Make ONLY the changes the user requests
      2. Preserve the existing structure and styling unless explicitly asked to change it
      3. Keep the code clean and well-formatted
      4. If the user's request is unclear, make a reasonable interpretation

      ## USER REQUEST:
      "${message}"

      ## OUTPUT FORMAT (JSON only, no markdown):
      {
        "html": "BODY CONTENT ONLY - no DOCTYPE, html, head, or body tags. Just the inner content like divs, sections, etc.",
        "css": "the complete updated CSS",
        "js": "any JavaScript if needed",
        "changes": "brief description of what you changed"
      }

      CRITICAL: The "html" field must contain ONLY the body content, NOT a full HTML document.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: systemPrompt }] }]
    });

    const text = response.text || "";
    
    console.log("Chat AI response:", text.substring(0, 300));
    
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
      console.error("Failed to parse chat response:", text);
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
