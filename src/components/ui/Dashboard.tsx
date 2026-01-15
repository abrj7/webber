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
  Loader2,
  Trash2,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight
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
  generatedHtml?: string;
  canvasData?: { records?: unknown[] } | null;
  thumbnail?: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Refs for scrolling
  const topRef = React.useRef<HTMLDivElement>(null);
  const recentWorkRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search modal
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
      // Escape to close modal
      if (e.key === 'Escape') {
        setShowSearchModal(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
          onOpenProject(data.project.id, data.project.name);
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

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent card click
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      return;
    }
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p._id !== projectId));
      // Remove from starred and recent
      setStarredProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        localStorage.setItem('starredProjects', JSON.stringify(Array.from(newSet)));
        return newSet;
      });
      setRecentlyOpened(prev => {
        const newRecent = { ...prev };
        delete newRecent[projectId];
        localStorage.setItem('recentlyOpened', JSON.stringify(newRecent));
        return newRecent;
      });
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
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
    let filtered = projects;

    // Apply filter (all/starred/recent)
    if (activeFilter === 'starred') {
      filtered = projects.filter(p => starredProjects.has(p._id));
    } else if (activeFilter === 'recent') {
      // Only show projects that have been opened, sorted by most recent
      filtered = projects
        .filter(p => recentlyOpened[p._id])
        .sort((a, b) => (recentlyOpened[b._id] || 0) - (recentlyOpened[a._id] || 0));
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  })();

  return (
    <div className={styles['app-container']}>
      {/* Refined Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarCollapsed ? styles.collapsed : ''}`} data-tutorial="sidebar">
        <div className={styles['logo-container']}>
          <div className={styles['logo-square']}>SK</div>
          {!isSidebarCollapsed && <span className={styles['logo-text']}>Sketchy</span>}
        </div>

        <nav className={styles['nav-group']}>
          <div
            className={`${styles['nav-link']} ${activeFilter === 'all' ? styles.active : ''}`}
            title="Home"
            onClick={() => {
              setActiveFilter('all');
              topRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Home size={22} strokeWidth={2} />
            {!isSidebarCollapsed && <span>Dashboard</span>}
          </div>
          <div
            className={`${styles['nav-link']} ${activeFilter === 'recent' ? styles.active : ''}`}
            title="Recent"
            onClick={() => {
              setActiveFilter('recent');
              recentWorkRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Clock size={22} strokeWidth={2} />
            {!isSidebarCollapsed && <span>Recent</span>}
          </div>
          <div
            className={`${styles['nav-link']} ${activeFilter === 'starred' ? styles.active : ''}`}
            title="Starred"
            onClick={() => {
              setActiveFilter('starred');
              recentWorkRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
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
        <section ref={topRef}>
          <h1 className={styles['greeting-serif']}>
            {displayedGreeting}
            <span className={`${styles['typing-cursor']} ${isTypingComplete ? styles['cursor-blink'] : ''}`}>|</span>
          </h1>
          <p className={styles['sub-greeting']}>Your creative workspace is ready. Pick up where you left off.</p>

          <div className={styles['search-area']}>
            <div
              className={styles['search-pill']}
              onClick={() => setShowSearchModal(true)}
              style={{ cursor: 'pointer' }}
            >
              <Search size={22} color="#94a3b8" strokeWidth={2.5} />
              <div className={styles['search-input']} style={{ cursor: 'pointer' }}>
                {searchQuery || 'Search projects, components, or files...'}
              </div>
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
              data-tutorial="create-new"
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
        <section ref={recentWorkRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
            <h2 className={styles['recent-title']}>{getSectionTitle()}</h2>
            {filteredProjects.length > 0 && (
              <button
                onClick={() => setShowViewAllModal(true)}
                style={{ fontWeight: 700, color: '#005461', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
              >
                View All
              </button>
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
                  {...(index === 0 ? { 'data-tutorial': 'project-card' } : {})}
                >
                  <div className={styles['card-stage']} style={{ backgroundColor: PROJECT_COLORS[index % PROJECT_COLORS.length] }}>
                    <div className={styles['mockup-window']}>
                      <div className={styles['mockup-controls']}>
                        <div className={styles['mockup-dot']}></div>
                        <div className={styles['mockup-dot']}></div>
                        <div className={styles['mockup-dot']}></div>
                      </div>
                      {project.generatedHtml ? (
                        <iframe
                          srcDoc={project.generatedHtml}
                          className={styles['preview-iframe']}
                          title={`Preview of ${project.name}`}
                          sandbox="allow-scripts allow-same-origin"
                        />
                      ) : project.thumbnail ? (
                        <img
                          src={project.thumbnail}
                          alt={`Canvas preview of ${project.name}`}
                          className={styles['thumbnail-image']}
                        />
                      ) : project.canvasData?.records && project.canvasData.records.length > 0 ? (
                        <div className={styles['canvas-preview']}>
                          <Pencil size={32} color="#94a3b8" />
                          <span>Canvas saved</span>
                        </div>
                      ) : (
                        <div className={styles['empty-preview']}>
                          <span>Empty project</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles['card-content']}>
                    <h3 className={styles['project-title']}>{project.name}</h3>
                    <p className={styles['project-summary']}>
                      {project.generatedHtml ? 'Website generated' : project.canvasData?.records?.length ? 'Canvas in progress' : 'New project'}
                    </p>
                    <div className={styles['card-footer']}>
                      <div className={styles['footer-left']}>
                        <div className={styles['dot-indicator']}></div>
                        <span className={styles['date-label']}>{formatRelativeTime(project.updatedAt)}</span>
                      </div>
                      <div className={styles['footer-right']}>
                        <button
                          className={styles['delete-button']}
                          onClick={(e) => handleDeleteProject(e, project._id)}
                          title="Delete project"
                        >
                          <Trash2 size={18} strokeWidth={2} />
                        </button>
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
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Search Modal */}
      {showSearchModal && (
        <div className={styles['search-modal-overlay']} onClick={() => {
          setShowSearchModal(false);
          setSearchQuery('');
        }}>
          <div className={styles['search-modal']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['search-modal-header']}>
              <Search size={24} color="#005461" strokeWidth={2.5} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search projects..."
                className={styles['search-modal-input']}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button
                className={styles['search-modal-close']}
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                }}
              >
                ✕
              </button>
            </div>

            <div className={styles['search-modal-results']}>
              {searchQuery.trim() ? (
                filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <div
                      key={project._id}
                      className={styles['search-modal-result']}
                      onClick={() => {
                        handleOpenProject(project);
                        setSearchQuery('');
                        setShowSearchModal(false);
                      }}
                    >
                      <div className={styles['result-content']}>
                        <div className={styles['result-name']}>{project.name}</div>
                        <div className={styles['result-meta']}>
                          {formatRelativeTime(project.updatedAt)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles['search-empty']}>
                    No projects found matching "{searchQuery}"
                  </div>
                )
              ) : (
                <div className={styles['search-empty']}>
                  Start typing to search your projects...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Support Modal */}
      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />

      {/* View All Projects Modal - List View with Pagination */}
      {showViewAllModal && (() => {
        // Sort projects by most recent first
        const sortedProjects = [...filteredProjects].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        const totalPages = Math.ceil(sortedProjects.length / ITEMS_PER_PAGE);
        const startIndex = (viewAllPage - 1) * ITEMS_PER_PAGE;
        const paginatedProjects = sortedProjects.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        return (
          <div className={styles['view-all-overlay']} onClick={() => { setShowViewAllModal(false); setViewAllPage(1); }}>
            <div className={styles['view-all-modal']} onClick={(e) => e.stopPropagation()}>
              <div className={styles['view-all-header']}>
                <h2 className={styles['view-all-title']}>{getSectionTitle()}</h2>
                <span className={styles['view-all-count']}>{sortedProjects.length} projects</span>
                <button className={styles['view-all-close']} onClick={() => { setShowViewAllModal(false); setViewAllPage(1); }}>
                  <X size={24} />
                </button>
              </div>

              {/* List View */}
              <div className={styles['view-all-list']}>
                {paginatedProjects.map((project) => (
                  <div
                    key={project._id}
                    className={styles['view-all-row']}
                    onClick={() => {
                      setShowViewAllModal(false);
                      setViewAllPage(1);
                      handleOpenProject(project);
                    }}
                  >
                    <div className={styles['view-all-row-main']}>
                      <span className={styles['view-all-row-name']}>{project.name}</span>
                      <span className={styles['view-all-row-status']}>
                        {project.generatedHtml ? 'Website generated' : project.canvasData?.records?.length ? 'Canvas in progress' : 'New project'}
                      </span>
                    </div>
                    <div className={styles['view-all-row-meta']}>
                      <span className={styles['view-all-row-time']}>{formatRelativeTime(project.updatedAt)}</span>
                      <button
                        className={`${styles['view-all-row-star']} ${starredProjects.has(project._id) ? styles.starred : ''}`}
                        onClick={(e) => toggleStar(e, project._id)}
                        title={starredProjects.has(project._id) ? 'Unstar' : 'Star'}
                      >
                        <Star size={16} fill={starredProjects.has(project._id) ? '#facc15' : 'none'} />
                      </button>
                      <button
                        className={styles['view-all-row-delete']}
                        onClick={(e) => handleDeleteProject(e, project._id)}
                        title="Delete project"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles['view-all-pagination']}>
                  <button
                    className={styles['pagination-btn']}
                    onClick={() => setViewAllPage(p => Math.max(1, p - 1))}
                    disabled={viewAllPage === 1}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className={styles['pagination-info']}>
                    Page {viewAllPage} of {totalPages}
                  </span>
                  <button
                    className={styles['pagination-btn']}
                    onClick={() => setViewAllPage(p => Math.min(totalPages, p + 1))}
                    disabled={viewAllPage === totalPages}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
