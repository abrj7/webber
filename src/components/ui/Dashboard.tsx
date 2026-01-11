"use client";

import React, { useState } from "react";
import {
  Plus,
  Image as ImageIcon,
  Home,
  Search,
  Clock,
  Star,
  Users,
  HelpCircle,
  LayoutGrid,
  ArrowLeft,
  SlidersHorizontal
} from "lucide-react";
import styles from "./Dashboard.module.css";

interface DashboardProps {
  onCreateNew: () => void;
  onHome: () => void;
}

export default function Dashboard({ onCreateNew, onHome }: DashboardProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const recentWebsites = [
    {
      id: 1,
      name: "Lost & Found Portal",
      description: "A centralized service for tracking lost items across the UWaterloo campus with real-time status updates.",
      date: "Edited 2 mins ago",
      color: "#F0F9FF" // Soft Sky
    },
    {
      id: 2,
      name: "Communicative Interface",
      description: "Accessibility-focused communication board designed for neurodivergent students.",
      date: "Edited yesterday",
      color: "#FFF9F9" // Soft Petal
    }
  ];

  return (
    <div className={styles['app-container']}>
      {/* Refined Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles['logo-container']}>
          <div className={styles['logo-square']}>SK</div>
          {!isSidebarCollapsed && <span className={styles['logo-text']}>Sketchy</span>}
        </div>

        <nav className={styles['nav-group']}>
          <div className={`${styles['nav-link']} ${styles.active}`} title="Home">
            <Home size={22} strokeWidth={2} />
            {!isSidebarCollapsed && <span>Dashboard</span>}
          </div>
          <div className={styles['nav-link']} title="Recent">
            <Clock size={22} strokeWidth={2} />
            {!isSidebarCollapsed && <span>Recent</span>}
          </div>
          <div className={styles['nav-link']} title="Starred">
            <Star size={22} strokeWidth={2} />
            {!isSidebarCollapsed && <span>Starred</span>}
          </div>
        </nav>

        <div className="mt-auto pt-10 border-t border-slate-100" style={{ marginTop: 'auto', paddingTop: '2.5rem', borderTop: '1px solid #f1f5f9' }}>
          <div className={styles['nav-link']} title="Invite">
            <Users size={22} strokeWidth={2} />
            {!isSidebarCollapsed && <span>Community</span>}
          </div>
          <div className={styles['nav-link']} title="Help">
            <HelpCircle size={22} strokeWidth={2} />
            {!isSidebarCollapsed && <span>Support</span>}
          </div>
        </div>
      </aside>

      {/* Modern Main Scroll */}
      <main className={styles['main-scroll']}>
        <header className={styles['header-nav']}>
          <button className={styles['btn-action']} onClick={onHome}>
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span>Go Back</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#94a3b8', cursor: 'pointer' }} className="hover:text-black transition-colors">Give Feedback</span>
            <div className={styles['avatar-circle']}>AJ</div>
          </div>
        </header>

        {/* Editorial Greeting */}
        <section>
          <h1 className={styles['greeting-serif']}>Good morning, Aidan.</h1>
          <p className={styles['sub-greeting']}>Your creative workspace is ready. Pick up where you left off.</p>

          <div className={styles['search-area']}>
            <div className={styles['search-pill']}>
              <Search size={22} color="#94a3b8" strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Search projects, components, or files..."
                className={styles['search-input']}
              />
              <div className={styles['v-divider']}></div>
              <button style={{ padding: '0.75rem', borderRadius: '9999px', color: '#94a3b8' }} className="hover:bg-white hover:text-black">
                <SlidersHorizontal size={22} strokeWidth={2} />
              </button>
            </div>
          </div>
        </section>

        {/* Start Fresh Section */}
        <section style={{ marginBottom: '6rem' }}>
          <span className={styles['section-label']}>Create</span>
          <div className={styles['grid-templates']}>
            <div className={styles['card-new']} style={{ borderStyle: 'dashed', borderWidth: '2px' }} onClick={onCreateNew}>
              <div className={styles['icon-wrap']}>
                <Plus size={32} color="#000000" strokeWidth={2.5} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>Blank Space</span>
            </div>
            <div className={styles['card-new']}>
              <div className={styles['icon-wrap']}>
                <LayoutGrid size={32} color="#cbd5e1" strokeWidth={2} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>Landing Page</span>
            </div>
            <div className={styles['card-new']}>
              <div className={styles['icon-wrap']}>
                <ImageIcon size={32} color="#cbd5e1" strokeWidth={2} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>Portfolio</span>
            </div>
          </div>
        </section>

        {/* Recent Work Section */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
            <h2 className={styles['recent-title']}>Recent Work</h2>
            <a href="#" style={{ fontWeight: 700, color: '#005461' }}>View All</a>
          </div>

          <div className={styles['grid-projects']}>
            {recentWebsites.map((project) => (
              <div key={project.id} className={styles['project-card']}>
                <div className={styles['card-stage']} style={{ backgroundColor: project.color }}>
                  <div className={styles['mockup-window']}>
                    <div className={styles['mockup-controls']}>
                      <div className={styles['mockup-dot']}></div>
                      <div className={styles['mockup-dot']}></div>
                      <div className={styles['mockup-dot']}></div>
                    </div>
                    <div className={styles['mockup-header']}></div>
                    <div className={styles['mockup-grid']}>
                      <div className={styles['mockup-item']}></div>
                      <div className={styles['mockup-item']}></div>
                    </div>
                  </div>
                </div>
                <div className={styles['card-content']}>
                  <h3 className={styles['project-title']}>{project.name}</h3>
                  <p className={styles['project-summary']}>{project.description}</p>
                  <div className={styles['card-footer']}>
                    <div className={styles['dot-indicator']}></div>
                    <span className={styles['date-label']}>{project.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
