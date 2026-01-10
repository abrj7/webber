"use client";

import { useRef, useState, useEffect } from "react";
import styles from "./CustomCanvas.module.css";
import { ArrowLeft, Send } from "lucide-react";

export default function CustomCanvas({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [color, setColor] = useState("#000000");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // High DPI setup
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const context = canvas.getContext("2d");
    if (context) {
      context.scale(dpr, dpr);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 3;
      context.strokeStyle = color;
      setCtx(context);
    }

    // Handle resize
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      if (context) {
        context.scale(dpr, dpr);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 3;
        context.strokeStyle = color;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

  return (
    <div className={styles.container}>
      {/* Toolbar */}
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

        <button className={styles.generateBtn}>
          <Send size={16} style={{ marginRight: '8px' }}/>
          Generate
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
