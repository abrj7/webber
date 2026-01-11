"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import styles from "./CustomCanvas.module.css";
import { Menu, ArrowLeft, Send, RotateCcw, Download, Loader2, Settings, X, Sun, Moon, Rocket } from "lucide-react";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import ChatPanel from "./ChatPanel";
import { useStore } from "@/lib/store";

// Style presets
const STYLE_PRESETS = [
  { id: 'modern', label: 'Modern', description: 'Clean lines, subtle shadows, professional' },
  { id: 'minimalistic', label: 'Minimalistic', description: 'Simple, lots of whitespace, essential elements only' },
  { id: 'dynamic', label: 'Dynamic', description: 'Bold colors, animations, eye-catching' },
  { id: 'retro', label: 'Retro', description: '80s/90s vibes, vintage colors, nostalgic' },
  { id: 'glassmorphism', label: 'Glass', description: 'Frosted glass effects, blur, transparency' },
  { id: 'brutalist', label: 'Brutalist', description: 'Raw, bold typography, unconventional' },
] as const;

type StylePreset = typeof STYLE_PRESETS[number]['id'];

export default function CustomCanvas({ onBack }: { onBack: () => void }) {
  const [isChatCollapsed, setIsChatCollapsed] = useState(true); // Collapsed by default
  const [viewMode, setViewMode] = useState<'canvas' | 'split' | 'preview'>('split');
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Style customization state
  const [websiteStyle, setWebsiteStyle] = useState<StylePreset>('modern');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [accentColor, setAccentColor] = useState('#3b82f6');

  // Analysis data from AI (for dynamic suggestions)
  const [analysisData, setAnalysisData] = useState<{
    annotations: string[];
    layout: string;
    elements: string[];
  } | null>(null);

  // Deploy state
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployName, setDeployName] = useState("");
  const [pushToGitHub, setPushToGitHub] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);

  // Store for loading state
  const { isGenerating, setGenerating } = useStore();

  // Resize state for split view
  const [isDragging, setIsDragging] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50); // percentage
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // Handle resize move - optimized with requestAnimationFrame
  useEffect(() => {
    let animationFrameId: number | null = null;
    
    const handleResize = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      // Cancel any pending animation frame
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      // Use requestAnimationFrame for smooth updates
      animationFrameId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
        
        // Clamp between 20% and 80%
        setSplitPosition(Math.max(20, Math.min(80, newPosition)));
      });
    };

    const handleResizeEnd = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleResize, { passive: true });
      document.addEventListener('mouseup', handleResizeEnd);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const handleMount = useCallback((editorInstance: Editor) => {
    setEditor(editorInstance);
  }, []);

  // Update tldraw dark mode when isDarkMode changes
  useEffect(() => {
    if (editor) {
      editor.user.updateUserPreferences({ colorScheme: isDarkMode ? 'dark' : 'light' });
    }
  }, [editor, isDarkMode]);

  const handleGenerate = async (isRegenerate = false) => {
    if (isGenerating) return;
    
    if (!editor) {
      alert("Canvas not ready yet");
      return;
    }

    setGenerating(true);
    console.log(isRegenerate ? "🔄 Regenerating website..." : "🚀 Generating website...");

    // Safety timeout to reset generating state if something goes wrong
    const timeoutId = setTimeout(() => {
      setGenerating(false);
      console.warn("⚠️ Generation timed out - resetting UI");
    }, 60000); // 1 minute safety timeout

    try {
      // Get all shape IDs on the canvas
      const shapeIds = editor.getCurrentPageShapeIds();

      if (shapeIds.size === 0) {
        alert("Please draw something on the canvas first!");
        setGenerating(false);
        clearTimeout(timeoutId);
        return;
      }

      // Convert Set to Array for tldraw API
      const shapeIdArray = Array.from(shapeIds);

      // Use tldraw's getSvgElement method to export as SVG, then convert to PNG
      const svgElement = await editor.getSvgElement(shapeIdArray, {
        background: true,
        padding: 20,
      });

      if (!svgElement) {
        alert("Failed to export canvas");
        setGenerating(false);
        clearTimeout(timeoutId);
        return;
      }

      // getSvgElement returns { height, svg, width } - extract the actual SVG element and dimensions
      const { svg, width: svgWidth, height: svgHeight } = svgElement;

      // Serialize SVG element to string
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svg as Node);
      
      // Remove any external references that could cause tainted canvas
      // Replace xlink:href with href and remove any external URLs
      svgString = svgString.replace(/xlink:href/g, 'href');
      
      // Create the image with proper settings to avoid tainted canvas
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Use a data URL with properly encoded SVG
      const encodedSvg = encodeURIComponent(svgString)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
      const dataUrl = `data:image/svg+xml,${encodedSvg}`;

      img.onload = async () => {
        try {
          // Create a canvas to convert SVG to PNG
          const canvas = document.createElement('canvas');
          canvas.width = svgWidth;
          canvas.height = svgHeight;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // Fill white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            const base64Image = canvas.toDataURL('image/png');
            
            console.log("📸 Canvas exported! Sending to API...");

            const response = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image: base64Image,
                style: websiteStyle,
                backgroundColor,
                accentColor,
                currentHtml: isRegenerate ? generatedHtml : null, // Pass existing HTML for updates
              }),
            });

            const data = await response.json();
            console.log(`📦 AI Response received: HTML(${data.html?.length || 0} chars), CSS(${data.css?.length || 0} chars)`);

            if (data.error) {
              console.error("API Error:", data.error);
              alert("Error: " + data.error);
            } else {
              // Combine HTML, CSS, and JS into a single document
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
              setGeneratedHtml(fullHtml);
              
              if (viewMode === 'canvas') setViewMode('split');
            }
          }
        } catch (err) {
          console.error("API/Process error:", err);
          alert("Failed to generate website.");
        } finally {
          setGenerating(false);
          clearTimeout(timeoutId);
        }
      };

      img.onerror = () => {
        console.error("Failed to load SVG as image");
        setGenerating(false);
        clearTimeout(timeoutId);
        alert("Failed to process wireframe.");
      };

      img.src = dataUrl;

    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export canvas");
      setGenerating(false);
      clearTimeout(timeoutId);
    }
  };

  const handleRegenerate = () => {
    handleGenerate(true);
  };


  const handleExport = () => {
    if (!generatedHtml) {
      alert("No generated code to export yet!");
      return;
    }

    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sketchy-website.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeploy = async () => {
    if (!generatedHtml) {
      alert("No generated code to deploy yet!");
      return;
    }
    setShowDeployModal(true);
  };

  const handleDeployConfirm = async () => {
    if (!deployName.trim()) {
      alert("Please enter a project name");
      return;
    }

    setIsDeploying(true);
    setDeployedUrl(null);
    setGithubUrl(null);

    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: generatedHtml,
          projectName: deployName,
          pushToGitHub,
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert("Deploy error: " + data.error);
      } else {
        setDeployedUrl(data.url);
        setGithubUrl(data.githubUrl || null);
      }
    } catch (err) {
      console.error("Deploy error:", err);
      alert("Failed to deploy");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className={`${styles.container} ${isDarkMode ? styles.darkMode : ''}`}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.leftSection}>
          <button onClick={onBack} className={styles.iconBtn} title="Back to dashboard">
            <ArrowLeft size={20} />
          </button>
          <button className={styles.iconBtn} title="Menu">
            <Menu size={20} />
          </button>
          <button
            className={`${styles.iconBtn} ${showSettings ? styles.activeIconBtn : ''}`}
            title="Style Settings"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={20} />
          </button>
        </div>

        <div className={styles.centerSection}>
          <div className={styles.viewTabs}>
            <button
              className={`${styles.tabBtn} ${viewMode === 'canvas' ? styles.activeTab : ''}`}
              onClick={() => setViewMode('canvas')}
            >
              Canvas
            </button>
            <button
              className={`${styles.tabBtn} ${viewMode === 'split' ? styles.activeTab : ''}`}
              onClick={() => setViewMode('split')}
            >
              Split View
            </button>
            <button
              className={`${styles.tabBtn} ${viewMode === 'preview' ? styles.activeTab : ''}`}
              onClick={() => setViewMode('preview')}
            >
              Preview
            </button>
            <button
              className={styles.darkModeToggle}
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <div className={styles.rightSection}>
          <button
            className={styles.secondaryBtn}
            onClick={handleRegenerate}
            title="Regenerate"
            disabled={isGenerating}
          >
            <RotateCcw size={16} />
            <span>Regenerate</span>
          </button>

          <button className={styles.secondaryBtn} onClick={handleExport} title="Export HTML">
            <Download size={16} />
            <span>Export</span>
          </button>

          <button className={styles.deployBtn} onClick={handleDeploy} title="Deploy to Vercel">
            <Rocket size={16} />
            <span>Deploy</span>
          </button>

          <button
            className={styles.generateBtn}
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            style={{ opacity: isGenerating ? 0.7 : 1 }}
          >
            {isGenerating ? <Loader2 size={16} className={styles.spinning} /> : <Send size={16} />}
            <span>{isGenerating ? "Generating..." : "Generate"}</span>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className={styles.settingsPanel}>
          <div className={styles.settingsHeader}>
            <span>Style Settings</span>
            <button className={styles.iconBtn} onClick={() => setShowSettings(false)}>
              <X size={18} />
            </button>
          </div>

          <div className={styles.settingsContent}>
            {/* Style Presets */}
            <div className={styles.settingsSection}>
              <label className={styles.settingsLabel}>Website Style</label>
              <div className={styles.styleGrid}>
                {STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    className={`${styles.styleBtn} ${websiteStyle === preset.id ? styles.activeStyleBtn : ''}`}
                    onClick={() => setWebsiteStyle(preset.id)}
                    title={preset.description}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className={styles.settingsSection}>
              <label className={styles.settingsLabel}>Background Color</label>
              <div className={styles.colorPicker}>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className={styles.colorInput}
                />
                <span className={styles.colorValue}>{backgroundColor}</span>
              </div>
            </div>

            <div className={styles.settingsSection}>
              <label className={styles.settingsLabel}>Accent Color</label>
              <div className={styles.colorPicker}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className={styles.colorInput}
                />
                <span className={styles.colorValue}>{accentColor}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={styles.mainArea}>
        <div className={styles.splitContainer} ref={containerRef}>
          {/* tldraw Canvas */}
          {viewMode !== 'preview' && (
            <div
              className={`${styles.canvasSection} ${viewMode === 'canvas' ? styles.fullWidth : ''}`}
              style={viewMode === 'split' ? { width: `${splitPosition}%`, flex: 'none' } : undefined}
            >
              <Tldraw 
                onMount={handleMount} 
                persistenceKey="sketchy-canvas"
              />
            </div>
          )}

          {/* Resize Handle - only shown in split view */}
          {viewMode === 'split' && (
            <div
              className={`${styles.resizeHandle} ${isDragging ? styles.resizing : ''}`}
              onMouseDown={handleResizeStart}
            >
              <div className={styles.resizeHandleBar} />
            </div>
          )}

          {/* Preview Section */}
          {viewMode !== 'canvas' && (
            <div
              className={`${styles.previewSection} ${viewMode === 'preview' ? styles.fullWidth : ''}`}
              style={viewMode === 'split' ? { width: `${100 - splitPosition}%`, flex: 'none' } : undefined}
            >
              <div className={styles.previewHeader}>
                <span>Live Preview</span>
              </div>
              <iframe
                srcDoc={generatedHtml || `
                  <html>
                  <body style="margin:0;padding:2rem;font-family:system-ui;color:#9ca3af;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;text-align:center;">
                    <div>
                      <p style="font-size:1.25rem;margin:0 0 0.5rem;">Draw your wireframe</p>
                      <p style="font-size:0.875rem;margin:0;color:#d1d5db;">Click Generate to see the preview here</p>
                    </div>
                  </body>
                  </html>
                `}
                className={styles.previewIframe}
                title="Live Preview"
              />
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <ChatPanel
          isCollapsed={isChatCollapsed}
          onToggle={() => setIsChatCollapsed(!isChatCollapsed)}
          generatedHtml={generatedHtml}
          websiteStyle={websiteStyle}
          backgroundColor={backgroundColor}
          accentColor={accentColor}
          analysisData={analysisData}
          onHtmlUpdate={(newHtml: string) => setGeneratedHtml(newHtml)}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Deploy Modal */}
      {showDeployModal && (
        <div className={styles.modalOverlay} onClick={() => !isDeploying && setShowDeployModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Deploy to Vercel</h3>
              <button
                className={styles.iconBtn}
                onClick={() => !isDeploying && setShowDeployModal(false)}
                disabled={isDeploying}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalContent}>
              {!deployedUrl ? (
                <>
                  <label className={styles.modalLabel}>Project Name</label>
                  <input
                    type="text"
                    value={deployName}
                    onChange={(e) => setDeployName(e.target.value)}
                    placeholder="my-awesome-website"
                    className={styles.modalInput}
                    disabled={isDeploying}
                  />
                  <p className={styles.modalHint}>
                    Your site will be deployed to: <strong>{deployName || "project-name"}.vercel.app</strong>
                  </p>

                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={pushToGitHub}
                      onChange={(e) => setPushToGitHub(e.target.checked)}
                      disabled={isDeploying}
                      className={styles.checkbox}
                    />
                    <span>Also push to GitHub repository</span>
                  </label>

                  <button
                    className={styles.deployConfirmBtn}
                    onClick={handleDeployConfirm}
                    disabled={isDeploying || !deployName.trim()}
                  >
                    {isDeploying ? (
                      <>
                        <Loader2 size={16} className={styles.spinning} />
                        <span>Deploying...</span>
                      </>
                    ) : (
                      <>
                        <Rocket size={16} />
                        <span>Deploy Now</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className={styles.deploySuccess}>
                  <div className={styles.successIcon}>🎉</div>
                  <h4>Deployed Successfully!</h4>

                  {githubUrl && (
                    <>
                      <label className={styles.urlLabel}>GitHub Repository</label>
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.deployUrl}
                      >
                        {githubUrl}
                      </a>
                    </>
                  )}

                  <label className={styles.urlLabel}>Vercel Deployment</label>
                  <a
                    href={deployedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.deployUrl}
                  >
                    {deployedUrl}
                  </a>

                  <button
                    className={styles.secondaryBtn}
                    onClick={() => {
                      setShowDeployModal(false);
                      setDeployedUrl(null);
                      setGithubUrl(null);
                      setDeployName("");
                      setPushToGitHub(false);
                    }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
