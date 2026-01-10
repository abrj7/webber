"use client";

import { useState } from "react";
import { Home, Info, LayoutGrid, HandHeart, HelpCircle, Users } from "lucide-react";
import styles from "./page.module.css";
import Dashboard from "@/components/ui/Dashboard";
import CustomCanvas from "@/components/canvas/CustomCanvas";
import AuthPage from "@/components/auth/AuthPage";

// View states: AUTH (login/signup) -> LANDING -> DASHBOARD -> CANVAS
type ViewState = "AUTH" | "LANDING" | "DASHBOARD" | "CANVAS";

export default function HomePage() {
  // Start with AUTH view - user must login/signup first
  const [view, setView] = useState<ViewState>("AUTH");

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
          Webber
        </h1>

        <p className={styles.subtitle}>The world is your canvas.</p>

        <button 
          className={styles.startBtn}
          onClick={() => setView("DASHBOARD")}
        >
          Start Creating
        </button>

        <div style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.6, fontFamily: 'VT323, monospace' }}>
          Draw it. Build it. Ship it.
        </div>

        {/* Bottom Dock */}
        <div className={styles.dock}>
          <div className={styles.dockItem}>
            <Home size={20} />
          </div>
          <div className={styles.dockItem}>
            <Info size={20} />
          </div>
          <div className={styles.dockItem}>
            <LayoutGrid size={20} />
          </div>
          <div className={styles.dockItem}>
            <HandHeart size={20} />
          </div>
          <div className={styles.dockItem}>
            <HelpCircle size={20} />
          </div>
          <div className={styles.dockItem}>
            <Users size={20} />
          </div>
        </div>
        
        <div style={{ position: 'absolute', bottom: '1rem', right: '2rem', fontSize: '0.8rem', opacity: 0.5 }}>
          MLH Code of Conduct
        </div>
      </div>
    </main>
  );
}
