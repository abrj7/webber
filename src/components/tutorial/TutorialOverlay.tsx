"use client";

import { useEffect, useState, useRef } from "react";
import { useTutorial } from "@/contexts/TutorialContext";
import styles from "./TutorialOverlay.module.css";

export default function TutorialOverlay() {
    const { isActive, currentStep, currentStepIndex, steps, nextStep, skipTutorial } = useTutorial();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isActive || !currentStep || !currentStep.target) {
            setTargetRect(null);
            return;
        }

        const updateRect = () => {
            const element = document.querySelector(currentStep.target);
            if (element) {
                const rect = element.getBoundingClientRect();
                setTargetRect(rect);
            } else {
                setTargetRect(null);
            }
        };

        // Initial find
        updateRect();

        // Update on resize/scroll
        window.addEventListener("resize", updateRect);
        window.addEventListener("scroll", updateRect, true);

        // Poll for element
        const interval = setInterval(updateRect, 300);

        return () => {
            window.removeEventListener("resize", updateRect);
            window.removeEventListener("scroll", updateRect, true);
            clearInterval(interval);
        };
    }, [isActive, currentStep]);

    if (!isActive || !currentStep) return null;

    const isCompletionStep = currentStep.id === "complete";
    const isLastStep = currentStepIndex === steps.length - 1;

    // Calculate tooltip position - clamped to stay on screen
    const getTooltipStyle = (): React.CSSProperties => {
        if (isCompletionStep || !targetRect) {
            // Center in screen for completion
            return {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            };
        }

        const padding = 16;
        const tooltipWidth = 320; // approximate width
        const tooltipHeight = 180; // approximate height
        const position = currentStep.position || "bottom";

        // Calculate base position
        let top: number | undefined;
        let left: number | undefined;
        let right: number | undefined;
        let bottom: number | undefined;

        switch (position) {
            case "top":
                bottom = window.innerHeight - targetRect.top + padding;
                left = targetRect.left + targetRect.width / 2;
                break;
            case "bottom":
                top = targetRect.bottom + padding;
                left = targetRect.left + targetRect.width / 2;
                break;
            case "left":
                top = targetRect.top + targetRect.height / 2;
                right = window.innerWidth - targetRect.left + padding;
                break;
            case "right":
                top = targetRect.top + targetRect.height / 2;
                left = targetRect.right + padding;
                break;
            default:
                top = targetRect.bottom + padding;
                left = targetRect.left + targetRect.width / 2;
        }

        // Clamp left position to stay on screen
        if (left !== undefined) {
            const minLeft = tooltipWidth / 2 + 20;
            const maxLeft = window.innerWidth - tooltipWidth / 2 - 20;
            left = Math.max(minLeft, Math.min(maxLeft, left));
        }

        // Clamp top position
        if (top !== undefined) {
            top = Math.max(20, Math.min(window.innerHeight - tooltipHeight - 20, top));
        }

        // Build style object
        const style: React.CSSProperties = {};
        if (top !== undefined) style.top = `${top}px`;
        if (left !== undefined) {
            style.left = `${left}px`;
            style.transform = position === "left" || position === "right" ? "translateY(-50%)" : "translateX(-50%)";
        }
        if (right !== undefined) style.right = `${right}px`;
        if (bottom !== undefined) style.bottom = `${bottom}px`;

        return style;
    };

    return (
        <div className={styles.overlay}>
            {/* Semi-transparent backdrop with spotlight cutout */}
            {targetRect && !isCompletionStep && (
                <svg className={styles.backdrop} width="100%" height="100%">
                    <defs>
                        <mask id="spotlight-mask">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            <rect
                                x={targetRect.left - 8}
                                y={targetRect.top - 8}
                                width={targetRect.width + 16}
                                height={targetRect.height + 16}
                                rx="12"
                                fill="black"
                            />
                        </mask>
                    </defs>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="rgba(0, 0, 0, 0.75)"
                        mask="url(#spotlight-mask)"
                    />
                </svg>
            )}

            {/* Full backdrop for completion step */}
            {isCompletionStep && <div className={styles.fullBackdrop} />}

            {/* Spotlight highlight ring */}
            {targetRect && !isCompletionStep && (
                <div
                    className={styles.spotlight}
                    style={{
                        top: targetRect.top - 8,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                    }}
                />
            )}

            {/* Tooltip */}
            <div
                ref={tooltipRef}
                className={`${styles.tooltip} ${isCompletionStep ? styles.completionTooltip : ""}`}
                style={getTooltipStyle()}
            >
                <div className={styles.tooltipContent}>
                    <h3 className={styles.tooltipTitle}>{currentStep.title}</h3>
                    <p className={styles.tooltipDescription}>{currentStep.description}</p>

                    <div className={styles.tooltipFooter}>
                        <div className={styles.stepIndicator}>
                            {currentStepIndex + 1} / {steps.length}
                        </div>
                        <div className={styles.tooltipButtons}>
                            {!isCompletionStep && (
                                <button className={styles.skipButton} onClick={skipTutorial}>
                                    Skip
                                </button>
                            )}
                            <button className={styles.nextButton} onClick={nextStep}>
                                {isLastStep ? "Done" : "Next"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
