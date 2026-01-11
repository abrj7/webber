"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import styles from "./CustomCanvas.module.css";
import { Menu, ArrowLeft, Send, RotateCcw, Download, Loader2, Settings, X, Sun, Moon, History, Clock } from "lucide-react";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import ChatPanel from "./ChatPanel";
import { useStore } from "@/lib/store";
import NamePromptModal from "@/components/ui/NamePromptModal";

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

interface CustomCanvasProps {
  onBack: () => void;
  projectId?: string;
  projectName?: string;
}

export default function CustomCanvas({ onBack, projectId, projectName = "Untitled document" }: CustomCanvasProps) {
  const [isChatCollapsed, setIsChatCollapsed] = useState(true);
  const [viewMode, setViewMode] = useState<'canvas' | 'split' | 'preview'>('split');
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState(projectName);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<Array<{ _id: string; versionNumber: number; createdAt: string }>>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<{ _id: string; versionNumber: number; createdAt: string; generatedHtml: string } | null>(null);
  const [liveGeneratedHtml, setLiveGeneratedHtml] = useState("");

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

  // Store for loading state
  const { isGenerating, setGenerating } = useStore();

  // Resize state for split view
  const [isDragging, setIsDragging] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-save refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>("");

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // Handle resize move
  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;

      // Clamp between 20% and 80%
      setSplitPosition(Math.max(20, Math.min(80, newPosition)));
    };

    const handleResizeEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isDragging]);

  const handleMount = useCallback((editorInstance: Editor) => {
    setEditor(editorInstance);

    // Set up auto-save listener
    if (projectId) {
      editorInstance.sideEffects.registerAfterChangeHandler('shape', () => {
        // Debounced auto-save
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          saveCanvas(editorInstance);
        }, 2000); // Save 2 seconds after last edit
      });
    }
  }, [projectId]);

  // Auto-save function
  const saveCanvas = async (ed: Editor) => {
    if (!projectId) return;

    try {
      // Get all records from the store
      const allRecords = ed.store.allRecords();
      const snapshotJson = JSON.stringify(allRecords);

      // Don't save if nothing changed
      if (snapshotJson === lastSaveRef.current) return;
      lastSaveRef.current = snapshotJson;

      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvasData: { records: allRecords },
          generatedHtml,
        }),
      });
      console.log("✅ Auto-saved");
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  // Load project on mount
  useEffect(() => {
    if (projectId && editor) {
      fetch(`/api/projects/${projectId}`)
        .then(res => res.json())
        .then(data => {
          if (data.project?.canvasData?.records) {
            // Load the records into the store
            // Sanitize records to avoid tldraw validation errors (undefined fields)
            const records = data.project.canvasData.records.map((record: Record<string, unknown>) => {
              const sanitized: Record<string, unknown> = {
                ...record,
                meta: record.meta ?? {},
              };
              // Handle instance record's stylesForNextShape
              if (record.typeName === 'instance' && record.stylesForNextShape === undefined) {
                sanitized.stylesForNextShape = {};
              }
              return sanitized;
            });
            editor.store.put(records);
          }
          if (data.project?.generatedHtml) {
            setGeneratedHtml(data.project.generatedHtml);
          }
          if (data.project?.name) {
            setCurrentProjectName(data.project.name);
          }
        })
        .catch(err => console.error("Failed to load project:", err));
    }
  }, [projectId, editor]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle back button - show name modal if untitled
  const handleBack = async () => {
    // Save any pending changes
    if (editor && projectId) {
      await saveCanvas(editor);
    }

    // Show name prompt if untitled
    if (currentProjectName.startsWith("Untitled document")) {
      setShowNameModal(true);
    } else {
      onBack();
    }
  };

  // Handle name save
  const handleNameSave = async (newName: string) => {
    if (projectId && newName !== currentProjectName) {
      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      setCurrentProjectName(newName);
    }
    setShowNameModal(false);
    onBack();
  };

  // Fetch version history
  const fetchVersions = async () => {
    if (!projectId) return;

    setIsLoadingVersions(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`);
      const data = await res.json();
      console.log("Fetched versions:", data.versions);
      setVersions(data.versions || []);
    } catch (error) {
      console.error("Failed to fetch versions:", error);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  // Preview a version (shows version's HTML in preview pane)
  const previewVersion = async (version: { _id: string; versionNumber: number; createdAt: string }) => {
    console.log("Previewing version:", version._id);
    if (!projectId || !version._id) {
      console.error("Missing projectId or version._id");
      return;
    }

    try {
      // Fetch the version's full data
      const res = await fetch(`/api/projects/${projectId}/versions/${version._id}`);
      const data = await res.json();

      if (data.version) {
        // Store current live HTML before switching to version preview
        if (!viewingVersion) {
          setLiveGeneratedHtml(generatedHtml);
        }

        // Set the viewing version with its HTML
        setViewingVersion({
          _id: version._id,
          versionNumber: version.versionNumber,
          createdAt: version.createdAt,
          generatedHtml: data.version.generatedHtml || "",
        });

        // Show the version's HTML in preview
        setGeneratedHtml(data.version.generatedHtml || "");
        setShowHistory(false);
        console.log("📺 Showing version preview:", version.versionNumber);
      }
    } catch (error) {
      console.error("Failed to preview version:", error);
      alert("Failed to load version preview");
    }
  };

  // Confirm and restore the currently viewing version
  const confirmRestore = async () => {
    if (!viewingVersion || !projectId || !editor) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/versions/${viewingVersion._id}`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.project) {
        console.log("✅ Version restored to database!");

        // Load the restored canvas data directly instead of page reload
        if (data.project.canvasData?.records) {
          // Clear existing shapes and load restored ones
          const allShapeIds = editor.getCurrentPageShapeIds();
          if (allShapeIds.size > 0) {
            editor.deleteShapes(Array.from(allShapeIds));
          }

          // Sanitize and load records
          const records = data.project.canvasData.records.map((record: Record<string, unknown>) => {
            const sanitized: Record<string, unknown> = {
              ...record,
              meta: record.meta ?? {},
            };
            if (record.typeName === 'instance' && record.stylesForNextShape === undefined) {
              sanitized.stylesForNextShape = {};
            }
            return sanitized;
          });
          editor.store.put(records);
        }

        // Update the HTML preview with restored version
        if (data.project.generatedHtml) {
          setGeneratedHtml(data.project.generatedHtml);
        }

        // Clear version preview state (we're now "live" with restored data)
        setViewingVersion(null);
        setLiveGeneratedHtml(data.project.generatedHtml || "");

        // Refresh version list
        fetchVersions();

        console.log("✅ Canvas and preview updated with restored version!");
      }
    } catch (error) {
      console.error("Failed to restore version:", error);
      alert("Failed to restore version");
    }
  };

  // Exit version preview, go back to live
  const exitVersionPreview = () => {
    setGeneratedHtml(liveGeneratedHtml);
    setViewingVersion(null);
    console.log("↩️ Back to live preview");
  };

  // Load versions when history panel opens
  useEffect(() => {
    if (showHistory && projectId) {
      fetchVersions();
    }
  }, [showHistory, projectId]);

  // Update tldraw dark mode when isDarkMode changes
  useEffect(() => {
    if (editor) {
      editor.user.updateUserPreferences({ colorScheme: isDarkMode ? 'dark' : 'light' });
    }
  }, [editor, isDarkMode]);

  const handleGenerate = async () => {
    if (!editor) {
      alert("Canvas not ready yet");
      return;
    }

    setGenerating(true);

    try {
      // Get all shape IDs on the canvas
      const shapeIds = editor.getCurrentPageShapeIds();

      if (shapeIds.size === 0) {
        alert("Please draw something on the canvas first!");
        setGenerating(false);
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
        return;
      }

      // getSvgElement returns { height, svg, width } - extract the actual SVG element and dimensions
      const { svg, width: svgWidth, height: svgHeight } = svgElement;

      // Serialize SVG element to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg as Node);

      // Convert SVG to PNG using canvas
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = async () => {
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

          try {
            // Send to API with style settings
            const response = await fetch("/api/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image: base64Image,
                style: websiteStyle,
                backgroundColor,
                accentColor,
              }),
            });

            const data = await response.json();

            if (data.error) {
              console.error("API Error:", data.error);
              alert("Error: " + data.error);
            } else {
              // Log the AI's analysis of the wireframe
              if (data.analysis) {
                console.log("🎨 AI WIREFRAME ANALYSIS:");
                console.log("📝 Red Annotations Found:", data.analysis.annotations);
                console.log("📐 Layout Structure:", data.analysis.layout);
                console.log("🧩 Elements Created:", data.analysis.elements);

                // Store analysis data for dynamic suggestions
                setAnalysisData({
                  annotations: data.analysis.annotations || [],
                  layout: data.analysis.layout || "",
                  elements: data.analysis.elements || []
                });
              }

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

              // Save version after successful generation
              if (projectId) {
                try {
                  const allRecords = editor?.store.allRecords() || [];
                  await fetch(`/api/projects/${projectId}/versions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      canvasData: { records: allRecords },
                      generatedHtml: fullHtml,
                    }),
                  });
                  console.log("📸 Version saved!");
                  // Refresh version list if panel is open
                  if (showHistory) {
                    fetchVersions();
                  }
                } catch (versionErr) {
                  console.error("Failed to save version:", versionErr);
                }
              }

              // Auto-switch to split view if in canvas-only mode
              if (viewMode === 'canvas') {
                setViewMode('split');
              }
            }
          } catch (err) {
            console.error("Fetch error:", err);
            alert("Failed to connect to API");
          }
        }

        URL.revokeObjectURL(url);
        setGenerating(false);
      };

      img.onerror = () => {
        console.error("Failed to load SVG as image");
        URL.revokeObjectURL(url);
        setGenerating(false);
        alert("Failed to process canvas");
      };

      img.src = url;

    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export canvas");
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
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
    a.download = "webber-website.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${styles.container} ${isDarkMode ? styles.darkMode : ''}`}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.leftSection}>
          <button onClick={handleBack} className={styles.iconBtn} title="Back to dashboard">
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
            className={`${styles.secondaryBtn} ${showHistory ? styles.activeBtn : ''}`}
            onClick={() => setShowHistory(!showHistory)}
            title="Version History"
          >
            <History size={16} />
            <span>History</span>
          </button>

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

          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
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

      {/* Version History Panel */}
      {showHistory && (
        <div className={styles.settingsPanel}>
          <div className={styles.settingsHeader}>
            <span>Version History</span>
            <button className={styles.iconBtn} onClick={() => setShowHistory(false)}>
              <X size={18} />
            </button>
          </div>

          <div className={styles.settingsContent}>
            {isLoadingVersions ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader2 size={24} className={styles.spinning} />
              </div>
            ) : versions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                <History size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>No versions yet</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem' }}>Click Generate to create a version</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {versions.map((version) => (
                  <button
                    key={version._id}
                    className={styles.versionItem}
                    onClick={() => previewVersion(version)}
                    title="Click to preview this version"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={14} />
                      <span style={{ fontWeight: 600 }}>Version {version.versionNumber}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {new Date(version.createdAt).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
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
                persistenceKey={projectId ? `webber-project-${projectId}` : undefined}
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
              {viewingVersion ? (
                <div className={styles.versionBanner}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Clock size={16} />
                    <span>
                      <strong>Viewing Version {viewingVersion.versionNumber}</strong>
                      <span style={{ marginLeft: '0.5rem', opacity: 0.7, fontSize: '0.8125rem' }}>
                        {new Date(viewingVersion.createdAt).toLocaleString()}
                      </span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={exitVersionPreview}
                      className={styles.secondaryBtn}
                      style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                    >
                      Back to Live
                    </button>
                    <button
                      onClick={confirmRestore}
                      className={styles.generateBtn}
                      style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                    >
                      Restore this version
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.previewHeader}>
                  <span>Live Preview</span>
                </div>
              )}
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

      {/* Name Prompt Modal */}
      <NamePromptModal
        isOpen={showNameModal}
        currentName={currentProjectName}
        onSave={handleNameSave}
        onCancel={() => setShowNameModal(false)}
      />
    </div>
  );
}
