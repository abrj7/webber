"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";
import Dashboard from "@/components/ui/Dashboard";
import CustomCanvas from "@/components/canvas/CustomCanvas";
import AuthPage from "@/components/auth/AuthPage";
import { getCurrentUser, getGitHubUser } from "@/lib/auth";
import { TutorialProvider, useTutorial } from "@/contexts/TutorialContext";
import TutorialOverlay from "@/components/tutorial/TutorialOverlay";

// View states: AUTH (login/signup) -> LANDING -> DASHBOARD -> CANVAS
type ViewState = "AUTH" | "LANDING" | "DASHBOARD" | "CANVAS";

interface CurrentProject {
  id: string;
  name: string;
}

function HomePageContent() {
  // Start with AUTH view - user must login/signup first
  const [view, setView] = useState<ViewState>("AUTH");
  const [currentProject, setCurrentProject] = useState<CurrentProject | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const { startTutorial, setPageNavigator, isActive: tutorialActive } = useTutorial();

  // Register page navigator for tutorial
  const navigateToPage = useCallback((page: string) => {
    if (page === "landing") setView("LANDING");
    else if (page === "dashboard") setView("DASHBOARD");
    else if (page === "canvas") {
      // Navigate to canvas without project for tutorial (avoids MongoDB error)
      setCurrentProject(null);
      setView("CANVAS");
    }
  }, []);

  useEffect(() => {
    setPageNavigator(navigateToPage);
  }, [setPageNavigator, navigateToPage]);

  // Check if user is already logged in on mount
  useEffect(() => {
    const existingUser = getCurrentUser();
    const githubUser = getGitHubUser();

    if (existingUser || githubUser) {
      // User is already logged in, skip to landing
      setView("LANDING");
    }
    setIsCheckingAuth(false);
  }, []);

  // Handle logout - return to auth page
  const handleLogout = () => {
    setView("AUTH");
  };

  // Handle opening a project
  const handleOpenProject = (projectId: string, projectName: string) => {
    setCurrentProject({ id: projectId, name: projectName });
    setView("CANVAS");
  };

  // Handle starting tutorial
  const handleStartTutorial = () => {
    startTutorial();
    setView("LANDING");
  };

  // Show loading while checking auth status
  if (isCheckingAuth) {
    return (
      <main className="mesh-background" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ fontFamily: '"Fuzzy Bubbles", cursive', fontSize: '2rem', color: '#005461' }}>
          Loading...
        </div>
      </main>
    );
  }

  // Auth page - login/signup
  if (view === "AUTH") {
    return <AuthPage onAuthSuccess={() => setView("LANDING")} />;
  }

  // Dashboard - project gallery
  if (view === "DASHBOARD") {
    return (
      <>
        <Dashboard
          onCreateNew={() => setView("CANVAS")}
          onHome={() => setView("LANDING")}
          onLogout={handleLogout}
          onOpenProject={handleOpenProject}
        />
        <TutorialOverlay />
      </>
    );
  }

  // Canvas - drawing area
  if (view === "CANVAS") {
    return (
      <>
        <CustomCanvas
          onBack={() => {
            setCurrentProject(null);
            setView("DASHBOARD");
          }}
          projectId={currentProject?.id}
          projectName={currentProject?.name}
        />
        <TutorialOverlay />
      </>
    );
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
          data-tutorial="start-creating"
        >
          Start Creating
        </button>

        <button
          className={styles.tutorialBtn}
          onClick={handleStartTutorial}
        >
          Take a Tour
        </button>

        <div style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.6, fontFamily: '"Fuzzy Bubbles", cursive' }}>
          Draw it. Build it. Ship it.
        </div>

      </div>
      <TutorialOverlay />
    </main>
  );
}

export default function HomePage() {
  return (
    <TutorialProvider>
      <HomePageContent />
    </TutorialProvider>
  );
}
