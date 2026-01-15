"use client";

import { useState } from "react";
import { X, ChevronLeft, Send, Loader2 } from "lucide-react";
import styles from "./ChatPanel.module.css";

interface ChatPanelProps {
    isCollapsed: boolean;
    onToggle: () => void;
    generatedHtml: string;
    websiteStyle: string;
    backgroundColor: string;
    accentColor: string;
    analysisData: {
        annotations: string[];
        layout: string;
        elements: string[];
    } | null;
    onHtmlUpdate: (newHtml: string) => void;
}

interface HistoryItem {
    id: number;
    text: string;
    timestamp: string;
    type: 'user' | 'ai';
}

export default function ChatPanel({
    isCollapsed,
    onToggle,
    generatedHtml,
    websiteStyle,
    backgroundColor,
    accentColor,
    analysisData,
    onHtmlUpdate
}: ChatPanelProps) {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // Generate dynamic suggestions based on website style and detected elements
    const generateSuggestions = (): string[] => {
        const styleSuggestions: Record<string, string[]> = {
            modern: [
                "Add a subtle gradient background",
                "Make the buttons more rounded",
                "Add hover animations",
            ],
            minimalistic: [
                "Increase whitespace",
                "Remove borders, use shadows instead",
                "Make text larger",
            ],
            dynamic: [
                "Add more vibrant colors",
                "Include a fade-in animation",
                "Make the CTA button pulse",
            ],
            retro: [
                "Add a pixelated border",
                "Use a warmer color palette",
                "Add a VHS effect overlay",
            ],
            glassmorphism: [
                "Increase the blur effect",
                "Add more transparency",
                "Add a subtle glow",
            ],
            brutalist: [
                "Make borders thicker",
                "Use a monospace font",
                "Add asymmetric spacing",
            ],
        };

        const baseSuggestions = styleSuggestions[websiteStyle] || styleSuggestions.modern;

        // Add element-specific suggestions if we have analysis data
        if (analysisData?.elements && analysisData.elements.length > 0) {
            const elementSuggestions: string[] = [];
            for (const element of analysisData.elements.slice(0, 2)) {
                elementSuggestions.push(`Make the ${element} larger`);
            }
            return [...baseSuggestions.slice(0, 3), ...elementSuggestions.slice(0, 2)];
        }

        return baseSuggestions;
    };

    const handleApplyChanges = async () => {
        if (!prompt.trim()) return;

        if (!generatedHtml) {
            alert("Generate a website first before using chat!");
            return;
        }

        setIsLoading(true);

        // Add user message to history
        const userMessage: HistoryItem = {
            id: Date.now(),
            text: prompt,
            timestamp: new Date().toLocaleTimeString(),
            type: 'user'
        };
        setHistory(prev => [...prev, userMessage]);

        const currentPrompt = prompt;
        setPrompt("");

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: currentPrompt,
                    currentHtml: generatedHtml,
                    style: websiteStyle,
                    backgroundColor,
                    accentColor,
                }),
            });

            const data = await response.json();

            if (data.error) {
                console.error("Chat Error:", data.error);
                const errorMessage: HistoryItem = {
                    id: Date.now() + 1,
                    text: `Error: ${data.error}`,
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'ai'
                };
                setHistory(prev => [...prev, errorMessage]);
            } else {
                // Update the preview with new HTML
                const fullHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>${data.css || ""}</style>
                    </head>
                    <body>
                        ${data.html || ""}
                        <script>${data.js || ""}</script>
                    </body>
                    </html>
                `;
                onHtmlUpdate(fullHtml);

                // Add AI response to history
                const aiMessage: HistoryItem = {
                    id: Date.now() + 1,
                    text: data.changes || "Changes applied!",
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'ai'
                };
                setHistory(prev => [...prev, aiMessage]);

                console.log("✅ Chat changes applied:", data.changes);
            }
        } catch (err) {
            console.error("Chat fetch error:", err);
            const errorMessage: HistoryItem = {
                id: Date.now() + 1,
                text: "Failed to connect to AI. Please try again.",
                timestamp: new Date().toLocaleTimeString(),
                type: 'ai'
            };
            setHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleApplyChanges();
        }
    };

    const suggestions = generateSuggestions();

    return (
        <aside className={`${styles.panel} ${isCollapsed ? styles.collapsed : ''}`}>
            {isCollapsed ? (
                <button className={styles.expandBtn} onClick={onToggle} title="Expand chat">
                    <ChevronLeft size={20} />
                </button>
            ) : (
                <>
                    <div className={styles.header}>
                        <h2 className={styles.title}>Edit with AI</h2>
                        <button className={styles.closeBtn} onClick={onToggle} title="Collapse">
                            <X size={18} />
                        </button>
                    </div>

                    <div className={styles.content}>
                        {/* Prompt Area */}
                        <div className={styles.promptSection}>
                            <textarea
                                className={styles.textarea}
                                placeholder={generatedHtml ? "Describe changes..." : "Generate a website first..."}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={3}
                                disabled={!generatedHtml || isLoading}
                            />
                            <button
                                className={styles.applyBtn}
                                onClick={handleApplyChanges}
                                disabled={!generatedHtml || !prompt.trim() || isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={16} className={styles.spinning} />
                                        <span>Applying...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        <span>Apply Changes</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Suggestions */}
                        {generatedHtml && (
                            <div className={styles.suggestions}>
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        className={styles.chip}
                                        onClick={() => setPrompt(suggestion)}
                                        disabled={isLoading}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* History */}
                        {history.length > 0 && (
                            <div className={styles.historySection}>
                                <h3 className={styles.historyTitle}>Chat History</h3>
                                {history.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`${styles.historyItem} ${item.type === 'user' ? styles.userMessage : styles.aiMessage}`}
                                    >
                                        <p className={styles.historyText}>{item.text}</p>
                                        <span className={styles.timestamp}>
                                            {item.type === 'user' ? 'You' : 'AI'} • {item.timestamp}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </aside>
    );
}
