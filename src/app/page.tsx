"use client";

import { useState } from "react";
import { Home, Info, LayoutGrid, HandHeart, HelpCircle, Users } from "lucide-react";
import styles from "./page.module.css";
import Dashboard from "@/components/ui/Dashboard";
import CustomCanvas from "@/components/canvas/CustomCanvas";

type ViewState = "LANDING" | "DASHBOARD" | "CANVAS";

export default function HomePage() {
  const [view, setView] = useState<ViewState>("LANDING");

  if (view === "DASHBOARD") {
    return <Dashboard onCreateNew={() => setView("CANVAS")} onHome={() => setView("LANDING")} />;
  }

  if (view === "CANVAS") {
    return <CustomCanvas onBack={() => setView("DASHBOARD")} />;
  }

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
