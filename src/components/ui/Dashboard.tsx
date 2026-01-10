"use client";

import { Plus, Image as ImageIcon, MoreVertical, Home } from "lucide-react";
import styles from "./Dashboard.module.css";

interface DashboardProps {
  onCreateNew: () => void;
  onHome: () => void;
}

export default function Dashboard({ onCreateNew, onHome }: DashboardProps) {
  // Mock data for drawings
  const recentDrawings = [
    { id: 1, name: "SaaS Landing Page", date: "2 mins ago" },
    { id: 2, name: "Portfolio Draft", date: "1 hour ago" },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={onHome} className={styles.menuBtn} style={{ marginRight: '1rem' }} title="Back to Home">
          <Home size={24} />
        </button>
        <div className={styles.actions}>
          <button className={styles.newBtn} onClick={onCreateNew}>
            <Plus size={18} />
            <span>New drawing</span>
          </button>
          <button className={styles.imageBtn}>
            <ImageIcon size={18} />
            <span>New from image</span>
          </button>
        </div>
        <button className={styles.menuBtn}>
          <MoreVertical size={20} />
        </button>
      </header>

      <main className={styles.grid}>
        {/* Create Card (Alternative) */}
        <div className={styles.card} onClick={onCreateNew}>
          <div className={`${styles.preview} ${styles.newPreview}`}>
             <Plus size={40} className={styles.plusIcon}/>
          </div>
          <div className={styles.cardFooter}>
            <span className={styles.cardTitle}>Blank Drawing</span>
          </div>
        </div>

        {/* Existing Drawings */}
        {recentDrawings.map((drawing) => (
          <div key={drawing.id} className={styles.card}>
            <div className={styles.preview}>
              {/* Placeholder for drawing preview */}
              <svg width="60" height="60" viewBox="0 0 100 100" stroke="#ccc" fill="none">
                <path d="M10,50 Q25,25 50,50 T90,50" strokeWidth="4" />
              </svg>
            </div>
            <div className={styles.cardFooter}>
              <div>
                <span className={styles.cardTitle}>{drawing.name}</span>
                <span className={styles.cardDate}>{drawing.date}</span>
              </div>
              <button className={styles.cardMenuBtn}>
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
