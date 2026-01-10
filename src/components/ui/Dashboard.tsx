"use client";

import { Plus, Image as ImageIcon, MoreVertical, Home, Search, Clock, Star, Users, HelpCircle, LayoutGrid, Menu, ArrowLeft, SlidersHorizontal } from "lucide-react";
import styles from "./Dashboard.module.css";
import { useState } from "react";

interface DashboardProps {
  onCreateNew: () => void;
  onHome: () => void;
}

export default function Dashboard({ onCreateNew, onHome }: DashboardProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const recentWebsites = [
    { id: 1, name: "Lost & Found", description: "Centralized lost-and-found service f...", date: "Edited 2 mins ago" },
    { id: 2, name: "Communicative Bracelet", description: "Interface for neurodivergent students.", date: "Edited yesterday" },
    { id: 3, name: "Flowboard Landing", description: "Marketing page for the project.", date: "Edited 2 days ago" },
  ];

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.branding}>
            {!isSidebarCollapsed && (
              <>
                <div className={styles.logo}>DH</div>
                <span className={styles.brandName}>DeltaHacks</span>
              </>
            )}
            <button
              className={styles.toggleBtn}
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu size={20} />
            </button>
          </div>

          <nav className={styles.nav}>
            <div className={`${styles.navItem} ${styles.active}`} title="Home">
              <Home size={18} />
              {!isSidebarCollapsed && <span>Home</span>}
            </div>
            <div className={styles.navItem} title="Recent">
              <Clock size={18} />
              {!isSidebarCollapsed && <span>Recent</span>}
            </div>
            <div className={styles.navItem} title="Starred">
              <Star size={18} />
              {!isSidebarCollapsed && <span>Starred</span>}
            </div>
          </nav>

          {!isSidebarCollapsed && (
            <div className={styles.spacesSection}>
              <div className={styles.spacesHeader}>
                <span>SPACES</span>
                <Plus size={14} />
              </div>
              <div className={styles.spaceItem}>
                <span className={styles.spaceDot}></span>
                <span>Hackathon</span>
              </div>
              <div className={styles.spaceItem}>
                <span className={styles.spaceDot}></span>
                <span>Design System</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.navItem} title="Invite members">
            <Users size={18} />
            {!isSidebarCollapsed && <span>Invite members</span>}
          </div>
          <div className={styles.navItem} title="Help & resources">
            <HelpCircle size={18} />
            {!isSidebarCollapsed && <span>Help & resources</span>}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={onHome} title="Back to landing page">
            <ArrowLeft size={18} />
            <span>Back to Home</span>
          </button>
          <div className={styles.topBarRight}>
            <button className={styles.feedbackBtn}>Feedback</button>
            <div className={styles.userAvatar}>AJ</div>
          </div>
        </div>

        {/* Hero Section */}
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Let's create something new, Aidan.</h1>
          <div className={styles.searchBar}>
            <Search size={20} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search designs, folders and uploads"
              className={styles.searchInput}
            />
            <button className={styles.filterBtn}>
              <SlidersHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Start From Scratch Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>START FROM SCRATCH</h2>
          <div className={styles.templateGrid}>
            <div className={`${styles.templateCard} ${styles.blankCard}`} onClick={onCreateNew}>
              <Plus size={32} className={styles.templateIcon} />
              <span className={styles.templateLabel}>Blank Website</span>
            </div>
            <div className={styles.templateCard}>
              <LayoutGrid size={32} className={styles.templateIcon} />
              <span className={styles.templateLabel}>Landing Page</span>
            </div>
            <div className={styles.templateCard}>
              <ImageIcon size={32} className={styles.templateIcon} />
              <span className={styles.templateLabel}>Portfolio</span>
            </div>
          </div>
        </section>

        {/* Recent Work Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>RECENT WORK</h2>
            <button className={styles.viewAllBtn}>View All</button>
          </div>
          <div className={styles.projectGrid}>
            {recentWebsites.map((project) => (
              <div key={project.id} className={styles.projectCard}>
                <div className={styles.projectPreview}>
                  <div className={styles.previewContent}></div>
                </div>
                <div className={styles.projectInfo}>
                  <h3 className={styles.projectName}>{project.name}</h3>
                  <p className={styles.projectDesc}>{project.description}</p>
                  <div className={styles.projectMeta}>
                    <span className={styles.statusDot}></span>
                    <span className={styles.projectDate}>{project.date}</span>
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
