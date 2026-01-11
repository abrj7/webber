"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import Dashboard from "@/components/ui/Dashboard";
import CustomCanvas from "@/components/canvas/CustomCanvas";
import AuthPage from "@/components/auth/AuthPage";

// View states: AUTH (login/signup) -> LANDING -> DASHBOARD -> CANVAS
type ViewState = "AUTH" | "LANDING" | "DASHBOARD" | "CANVAS";

export default function HomePage() {
  // Start with AUTH view - user must login/signup first
  const [view, setView] = useState<ViewState>("AUTH");

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      const cookies = document.cookie.split(';');
      const hasUser = cookies.some(c => c.trim().startsWith('github_user='));
      if (hasUser) {
        setView("DASHBOARD");
      }
    };
    
    checkSession();
  }, []);

  // Auth page - login/signup
  if (view === "AUTH") {
    return <AuthPage onAuthSuccess={() => setView("LANDING")} />;
  }

  // Dashboard - project gallery
  if (view === "DASHBOARD") {
    return <Dashboard onCreateNew={() => setView("CANVAS")} onHome={() => setView("LANDING")} />;
  }

  // Canvas - drawing area
  if (view === "CANVAS") {
    return <CustomCanvas onBack={() => setView("DASHBOARD")} />;
  }

  // Landing page (shown after auth)
  return (
    <main className="mesh-background">
      <div className={styles.landingContainer}>
        
        <h1 className={styles.heroTitle}>
          SKETCHY
        </h1>

        <p className={styles.subtitle}>The world is your canvas.</p>

        <button 
          className={styles.startBtn}
          onClick={() => setView("DASHBOARD")}
        >
          Start Creating
        </button>

        <div style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.6, fontFamily: '"Fuzzy Bubbles", cursive' }}>
          Draw it. Build it. Ship it.
        </div>
      </div>
    </main>
  );
}

