"use client";

import React, { useState, useEffect } from "react";
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
  SlidersHorizontal,
  Loader2
} from "lucide-react";
import styles from "./Dashboard.module.css";
import UserProfile from "./UserProfile";
import SupportModal from "./SupportModal";
import { getCurrentUser, User, getGitHubUser } from "@/lib/auth";

interface Project {
  _id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
}

interface DashboardProps {
  onCreateNew: () => void;
  onHome: () => void;
  onLogout?: () => void;
  onOpenProject?: (projectId: string, projectName: string) => void;
}

// Get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `Edited ${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `Edited ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return "Edited yesterday";
  return `Edited ${diffDays} days ago`;
}

// Colors for project cards
const PROJECT_COLORS = ["#F0F9FF", "#FFF9F9", "#F0FFF4", "#FFFBEB", "#FDF4FF"];

export default function Dashboard({ onCreateNew, onHome, onLogout, onOpenProject }: DashboardProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [displayedGreeting, setDisplayedGreeting] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [starredProjects, setStarredProjects] = useState<Set<string>>(new Set());
  const [recentlyOpened, setRecentlyOpened] = useState<Record<string, number>>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'starred' | 'recent'>('all');

  useEffect(() => {
    const currentUser = getCurrentUser();
    const githubUser = getGitHubUser();

    // Prioritize standard user, then github user
    const activeUser = currentUser || githubUser;
    setUser(activeUser);

    // Load starred projects from localStorage
    const savedStarred = localStorage.getItem('starredProjects');
    if (savedStarred) {
      setStarredProjects(new Set(JSON.parse(savedStarred)));
    }

    // Load recently opened projects from localStorage
    const savedRecent = localStorage.getItem('recentlyOpened');
    if (savedRecent) {
      setRecentlyOpened(JSON.parse(savedRecent));
    }

    // Fetch user's projects
    if (activeUser) {
      // Use Mongo ID if available, otherwise GitHub ID
      const userId = String(activeUser.id);
      fetchProjects(userId);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Typewriter effect for greeting
  useEffect(() => {
    if (!user) return;

    const userName = user?.name?.split(' ')[0] || user?.login || 'Creator';
    const fullGreeting = `${getGreeting()}, ${userName}.`;
    let currentIndex = 0;
    setDisplayedGreeting('');
    setIsTypingComplete(false);

    const typingInterval = setInterval(() => {
      if (currentIndex < fullGreeting.length) {
        setDisplayedGreeting(fullGreeting.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTypingComplete(true);
        clearInterval(typingInterval);
      }
    }, 60);

    return () => clearInterval(typingInterval);
  }, [user]);

  const fetchProjects = async (userId: string) => {
    try {
      const res = await fetch(`/api/projects?userId=${userId}`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!user || isCreating) return;

    setIsCreating(true);
    try {
      const userId = String(user.id);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      if (data.project) {
        // Open the new project
        if (onOpenProject) {
          onOpenProject(data.project._id, data.project.name);
        } else {
          onCreateNew();
        }
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create a new project. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenProject = (project: Project) => {
    // Track this project as recently opened
    const newRecent = { ...recentlyOpened, [project._id]: Date.now() };
    setRecentlyOpened(newRecent);
    localStorage.setItem('recentlyOpened', JSON.stringify(newRecent));

    if (onOpenProject) {
      onOpenProject(project._id, project.name);
    }
  };

  const toggleStar = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent card click
    setStarredProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      localStorage.setItem('starredProjects', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const filteredProjects = (() => {
    if (activeFilter === 'starred') {
      return projects.filter(p => starredProjects.has(p._id));
    }
    if (activeFilter === 'recent') {
      // Only show projects that have been opened, sorted by most recent
      return projects
        .filter(p => recentlyOpened[p._id])
        .sort((a, b) => (recentlyOpened[b._id] || 0) - (recentlyOpened[a._id] || 0));
    }
    return projects;
  })();

  return (
    <div className={styles['app-container']}>
      {/* Refined Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles['logo-container']}>
          <div className={styles['logo-square']}>SK</div>
          {!isSidebarCollapsed && <span className={styles['logo-text']}>Sketchy</span>}
        </div>

        <nav className={styles['nav-group']}>
          <div
            className={`${styles['nav-link']} ${activeFilter === 'all' ? styles.active : ''}`}
            title="Home"
            onClick={() => setActiveFilter('all')}
          >
            <Home size={22} strokeWidth={2} />
            {!isSidebarCollapsed && <span>Dashboard</span>}
          </div>
          <div
            className={`${styles['nav-link']} ${activeFilter === 'recent' ? styles.active : ''}`}
            title="Recent"
            onClick={() => setActiveFilter('recent')}
          >
            <Clock size={22} strokeWidth={2} />
            {!isSidebarCollapsed && <span>Recent</span>}
          </div>
          <div
            className={`${styles['nav-link']} ${activeFilter === 'starred' ? styles.active : ''}`}
            title="Starred"
            onClick={() => setActiveFilter('starred')}
          >
            <Star size={22} strokeWidth={2} />
            {!isSidebarCollapsed && <span>Starred</span>}
          </div>
        </nav>

        <div className="mt-auto pt-10 border-t border-slate-100" style={{ marginTop: 'auto', paddingTop: '2.5rem', borderTop: '1px solid #f1f5f9' }}>
          <div className={styles['nav-link']} title="Invite">
            <Users size={22} strokeWidth={2} />
            {!isSidebarCollapsed && <span>Community</span>}
          </div>
          <div className={styles['nav-link']} title="Help" onClick={() => setIsSupportModalOpen(true)}>
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
            <a
              href="https://github.com/abrj7/sketchy"
              target="_blank"
              rel="noopener noreferrer"
              className={styles['github-star-link']}
            >
              <Star size={16} strokeWidth={2.5} className={styles['star-icon']} />
              <span>Star Sketchy on GitHub</span>
            </a>
            <UserProfile onLogout={onLogout} />
          </div>
        </header>

        {/* Editorial Greeting */}
        <section>
          <h1 className={styles['greeting-serif']}>
            {displayedGreeting}
            <span className={`${styles['typing-cursor']} ${isTypingComplete ? styles['cursor-blink'] : ''}`}>|</span>
          </h1>
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
            <div
              className={styles['card-new']}
              style={{ borderStyle: 'dashed', borderWidth: '2px', cursor: isCreating ? 'wait' : 'pointer' }}
              onClick={handleCreateNew}
            >
              <div className={styles['icon-wrap']}>
                {isCreating ? (
                  <Loader2 size={32} color="#005461" className={styles.spinner} />
                ) : (
                  <Plus size={32} color="#005461" strokeWidth={2.5} />
                )}
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                {isCreating ? "Creating..." : "Blank Space"}
              </span>
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
            {projects.length > 0 && (
              <a href="#" style={{ fontWeight: 700, color: '#005461' }}>View All</a>
            )}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader2 size={32} color="#94a3b8" className={styles.spinner} />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                {activeFilter === 'starred' ? 'No starred projects yet' :
                  activeFilter === 'recent' ? 'No recently opened projects' : 'No projects yet'}
              </p>
              <p style={{ fontSize: '0.875rem' }}>
                {activeFilter === 'starred'
                  ? 'Click the star icon on a project to add it here!'
                  : activeFilter === 'recent'
                    ? 'Open a project to see it here!'
                    : 'Click "Blank Space" to create your first project!'}
              </p>
            </div>
          ) : (
            <div className={styles['grid-projects']}>
              {filteredProjects.map((project, index) => (
                <div
                  key={project._id}
                  className={styles['project-card']}
                  onClick={() => handleOpenProject(project)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles['card-stage']} style={{ backgroundColor: PROJECT_COLORS[index % PROJECT_COLORS.length] }}>
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
                    <p className={styles['project-summary']}>Canvas project</p>
                    <div className={styles['card-footer']}>
                      <div className={styles['footer-left']}>
                        <div className={styles['dot-indicator']}></div>
                        <span className={styles['date-label']}>{formatRelativeTime(project.updatedAt)}</span>
                      </div>
                      <button
                        className={`${styles['star-button']} ${starredProjects.has(project._id) ? styles['starred'] : ''}`}
                        onClick={(e) => toggleStar(e, project._id)}
                        title={starredProjects.has(project._id) ? 'Unstar project' : 'Star project'}
                      >
                        <Star size={18} strokeWidth={2} fill={starredProjects.has(project._id) ? '#facc15' : 'none'} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Support Modal */}
      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />
    </div>
  );
}
