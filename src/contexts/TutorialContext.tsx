"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface TutorialStep {
    id: string;
    target: string; // CSS selector or data-tutorial attribute
    title: string;
    description: string;
    page: "landing" | "dashboard" | "canvas";
    position?: "top" | "bottom" | "left" | "right";
}

interface TutorialContextType {
    isActive: boolean;
    currentStepIndex: number;
    currentStep: TutorialStep | null;
    steps: TutorialStep[];
    startTutorial: () => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTutorial: () => void;
    endTutorial: () => void;
    goToPage: (page: "landing" | "dashboard" | "canvas") => void;
    setPageNavigator: (fn: (page: string) => void) => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
    // Landing
    {
        id: "start-creating",
        target: "[data-tutorial='start-creating']",
        title: "Welcome to Sketchy!",
        description: "Click 'Start Creating' to enter your dashboard where all your projects live.",
        page: "landing",
        position: "bottom",
    },
    // Dashboard
    {
        id: "sidebar",
        target: "[data-tutorial='sidebar']",
        title: "Navigation Sidebar",
        description: "Switch between Dashboard, Recent, and Starred projects to organize your work.",
        page: "dashboard",
        position: "right",
    },
    {
        id: "create-new",
        target: "[data-tutorial='create-new']",
        title: "Create New Project",
        description: "Start a fresh project from scratch. Your creativity begins here!",
        page: "dashboard",
        position: "bottom",
    },
    {
        id: "project-card",
        target: "[data-tutorial='create-new']",
        title: "Create Your First Project",
        description: "Click 'Blank Space' to create a new project. Go ahead, try it now!",
        page: "dashboard",
        position: "bottom",
    },
    // Canvas - Toolbar Left
    {
        id: "back-button",
        target: "[data-tutorial='back-button']",
        title: "Back to Dashboard",
        description: "Return to your project dashboard anytime.",
        page: "canvas",
        position: "bottom",
    },
    {
        id: "settings",
        target: "[data-tutorial='settings']",
        title: "Settings",
        description: "Customize your website's style, colors, and theme preferences.",
        page: "canvas",
        position: "bottom",
    },
    {
        id: "history",
        target: "[data-tutorial='history']",
        title: "Version History",
        description: "View and restore previous versions of your work. Never lose progress!",
        page: "canvas",
        position: "bottom",
    },
    // Canvas - View Modes
    {
        id: "canvas-tab",
        target: "[data-tutorial='canvas-tab']",
        title: "Canvas Mode",
        description: "Full canvas view for focused drawing and wireframing.",
        page: "canvas",
        position: "bottom",
    },
    {
        id: "split-view",
        target: "[data-tutorial='split-view']",
        title: "Split View",
        description: "See your canvas and live preview side by side.",
        page: "canvas",
        position: "bottom",
    },
    {
        id: "preview-tab",
        target: "[data-tutorial='preview-tab']",
        title: "Preview Mode",
        description: "View only the generated website in full width.",
        page: "canvas",
        position: "bottom",
    },
    // Canvas - Actions
    {
        id: "deploy",
        target: "[data-tutorial='deploy']",
        title: "Deploy",
        description: "Publish your website live to the internet with one click!",
        page: "canvas",
        position: "bottom",
    },
    {
        id: "regenerate",
        target: "[data-tutorial='regenerate']",
        title: "Regenerate",
        description: "Generate a fresh version of your website with different styling.",
        page: "canvas",
        position: "bottom",
    },
    {
        id: "generate",
        target: "[data-tutorial='generate']",
        title: "Generate Website",
        description: "Turn your wireframe into a real, working website using AI!",
        page: "canvas",
        position: "bottom",
    },
    // Canvas - Tools
    {
        id: "tool-picker",
        target: "[data-tutorial='tool-picker']",
        title: "Drawing Tools",
        description: "Use the tldraw tools on the left to draw shapes, add text, and create wireframes for your website.",
        page: "canvas",
        position: "bottom",
    },
    // Completion
    {
        id: "complete",
        target: "",
        title: "🎉 You're All Set!",
        description: "You now know all the features. Start creating amazing websites!",
        page: "canvas",
        position: "bottom",
    },
];

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [pageNavigator, setPageNavigatorFn] = useState<((page: string) => void) | null>(null);

    const currentStep = isActive ? TUTORIAL_STEPS[currentStepIndex] || null : null;

    const startTutorial = useCallback(() => {
        setCurrentStepIndex(0);
        setIsActive(true);
    }, []);

    const nextStep = useCallback(() => {
        if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
            const nextIndex = currentStepIndex + 1;
            const nextStepData = TUTORIAL_STEPS[nextIndex];
            const currentPage = TUTORIAL_STEPS[currentStepIndex]?.page;

            // Navigate to the correct page if needed
            if (nextStepData.page !== currentPage && pageNavigator) {
                pageNavigator(nextStepData.page);
            }

            setCurrentStepIndex(nextIndex);
        } else {
            // End tutorial
            setIsActive(false);
            setCurrentStepIndex(0);
        }
    }, [currentStepIndex, pageNavigator]);

    const prevStep = useCallback(() => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    }, [currentStepIndex]);

    const skipTutorial = useCallback(() => {
        setIsActive(false);
        setCurrentStepIndex(0);
    }, []);

    const endTutorial = useCallback(() => {
        setIsActive(false);
        setCurrentStepIndex(0);
    }, []);

    const goToPage = useCallback((page: "landing" | "dashboard" | "canvas") => {
        if (pageNavigator) {
            pageNavigator(page);
        }
    }, [pageNavigator]);

    const setPageNavigator = useCallback((fn: (page: string) => void) => {
        setPageNavigatorFn(() => fn);
    }, []);

    return (
        <TutorialContext.Provider
            value={{
                isActive,
                currentStepIndex,
                currentStep,
                steps: TUTORIAL_STEPS,
                startTutorial,
                nextStep,
                prevStep,
                skipTutorial,
                endTutorial,
                goToPage,
                setPageNavigator,
            }}
        >
            {children}
        </TutorialContext.Provider>
    );
}

export function useTutorial() {
    const context = useContext(TutorialContext);
    if (context === undefined) {
        throw new Error("useTutorial must be used within a TutorialProvider");
    }
    return context;
}
