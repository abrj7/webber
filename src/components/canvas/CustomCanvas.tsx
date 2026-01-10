"use client";

import { useRef, useState, useEffect } from "react";
import styles from "./CustomCanvas.module.css";
import { ArrowLeft, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import WebsitePreview from "../renderer/WebsitePreview";

export default function CustomCanvas({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [color, setColor] = useState("#000000");
  
  // Store
  const { setGenerating, setActiveWebsite, isGenerating } = useStore();

  // Initialize canvas with white background
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size to match display size (no DPI scaling for simplicity)
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const context = canvas.getContext("2d");
    if (context) {
      // Fill with white background FIRST
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Then set up drawing styles
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 3;
      context.strokeStyle = color;
      
      return context;
    }
    return null;
  };

  useEffect(() => {
    const context = initCanvas();
    if (context) {
      setCtx(context);
    }
    
    // Don't resize - it clears the canvas. User can refresh if needed.
  }, []);

  // Update color when state changes
  useEffect(() => {
    if (ctx) ctx.strokeStyle = color;
  }, [color, ctx]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!ctx) return;
    setIsDrawing(true);
    ctx.beginPath();
    const { x, y } = getCoordinates(e);
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (ctx) ctx.closePath();
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleGenerate = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setGenerating(true);
    
    try {
      // 1. Get Image
      const imageBase64 = canvas.toDataURL("image/png");

      // DEBUG: Log and open the captured image in a new tab
      console.log("📸 Canvas captured! Image size:", imageBase64.length, "bytes");
      console.log("🔗 Opening captured image in new tab for preview...");
      
      // Open the image in a new tab so you can see exactly what Gemini receives
      const debugWindow = window.open();
      if (debugWindow) {
        debugWindow.document.write(`
          <html>
            <head><title>Debug: Canvas Capture</title></head>
            <body style="margin:0; background:#000; display:flex; flex-direction:column; align-items:center; padding:20px;">
              <h2 style="color:white; font-family:sans-serif;">This is what Gemini sees:</h2>
              <img src="${imageBase64}" style="max-width:90%; border:2px solid #4988C4; border-radius:8px;"/>
            </body>
          </html>
        `);
      }

      // 2. Call API
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageBase64,
          type: "Landing Page", // Hardcoded for now, could be passed as prop
          prompt: "Convert this wireframe into a website." // Optional additional prompt
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert("Error generating site: " + data.error);
      } else {
        // 3. Update Store
        setActiveWebsite(data);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Website Preview Modal */}
      <WebsitePreview />

      <div className={styles.toolbar}>
        <button onClick={onBack} className={styles.iconBtn}>
          <ArrowLeft size={20} />
        </button>
        
        <div className={styles.tools}>
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)}
            className={styles.colorPicker}
          />
          <div className={styles.separator} />
          <button 
            className={`${styles.toolBtn} ${color === "#000000" ? styles.active : ""}`}
            onClick={() => setColor("#000000")}
          >
            Pen
          </button>
          <button 
             className={`${styles.toolBtn} ${color === "#ef4444" ? styles.active : ""}`}
             onClick={() => setColor("#ef4444")}
          >
            Marker
          </button>
        </div>

        <button 
          className={styles.generateBtn}
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{ opacity: isGenerating ? 0.7 : 1, cursor: isGenerating ? 'wait' : 'pointer' }}
        >
          <Send size={16} style={{ marginRight: '8px' }}/>
          {isGenerating ? "Magic..." : "Generate"}
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}
