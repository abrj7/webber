"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import styles from "./CustomCanvas.module.css";
import {
  Menu,
  ArrowLeft,
  Send,
  RotateCcw,
  Download,
  Loader2,
  Settings,
  X,
  Sun,
  Moon,
  Rocket,
  History,
  Clock,
  Layout,
  Columns,
  Eye,
  RotateCw,
  Pencil
} from "lucide-react";
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
  const [isChatCollapsed, setIsChatCollapsed] = useState(true); // Collapsed by default
  const [viewMode, setViewMode] = useState<'canvas' | 'split' | 'preview'>('canvas');
  const [showWelcome, setShowWelcome] = useState(true); // Welcome overlay state
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [showSettings, setShowSettings] = useState(false);


  // Backend/Persistence State
  const [showNameModal, setShowNameModal] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState(projectName);
  const [showHistory, setShowHistory] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [versions, setVersions] = useState<Array<{ _id: string; versionNumber: number; createdAt: string }>>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<{ _id: string; versionNumber: number; createdAt: string; generatedHtml: string } | null>(null);
  const [liveGeneratedHtml, setLiveGeneratedHtml] = useState("");
  const [liveCanvasData, setLiveCanvasData] = useState<unknown[] | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

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

  // Auto-save refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>("");

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

    // Listen for any user action to dismiss welcome overlay
    editorInstance.store.listen(() => {
      setShowWelcome(false);
    }, { source: 'user', scope: 'document' });

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

  // Auto-save function with thumbnail capture
  const saveCanvas = async (ed: Editor) => {
    if (!projectId || !isInitialLoadComplete) return;

    try {
      // Get all records from the store
      const allRecords = ed.store.allRecords();
      const snapshotJson = JSON.stringify(allRecords);

      // Don't save if nothing changed
      if (snapshotJson === lastSaveRef.current) return;
      lastSaveRef.current = snapshotJson;

      // Generate thumbnail from canvas
      let thumbnail = "";
      const shapeIds = ed.getCurrentPageShapeIds();
      if (shapeIds.size > 0) {
        try {
          const svgResult = await ed.getSvgElement(Array.from(shapeIds), {
            background: true,
            padding: 10,
          });
          if (svgResult?.svg) {
            const serializer = new XMLSerializer();
            let svgString = serializer.serializeToString(svgResult.svg);
            svgString = svgString.replace(/xlink:href/g, 'href');

            // Create small thumbnail (max 400px)
            const scale = Math.min(400 / svgResult.width, 400 / svgResult.height, 1);
            const thumbWidth = Math.round(svgResult.width * scale);
            const thumbHeight = Math.round(svgResult.height * scale);

            const img = new Image();
            const encodedSvg = encodeURIComponent(svgString).replace(/'/g, '%27').replace(/"/g, '%22');

            thumbnail = await new Promise<string>((resolve) => {
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = thumbWidth;
                canvas.height = thumbHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = 'white';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
                  resolve(canvas.toDataURL('image/png', 0.7));
                } else {
                  resolve("");
                }
              };
              img.onerror = () => resolve("");
              img.src = `data:image/svg+xml,${encodedSvg}`;
            });
          }
        } catch (err) {
          console.warn("Thumbnail generation failed:", err);
        }
      }

      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvasData: { records: allRecords },
          ...(thumbnail && { thumbnail }),
        }),
      });
      console.log("✅ Auto-saved canvas data" + (thumbnail ? " with thumbnail" : ""));
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
          if (data.project?.canvasData?.records && data.project.canvasData.records.length > 0) {
            // Hide welcome overlay since project has saved data
            setShowWelcome(false);
            // Load the records into the store
            // Sanitize records to avoid tldraw validation errors (undefined fields)
            const records = data.project.canvasData.records.map((record: any) => {
              const sanitized = {
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
          setIsInitialLoadComplete(true);
        })
        .catch(err => {
          console.error("Failed to load project:", err);
          setIsInitialLoadComplete(true); // Still set to true so we can save new work if fetch fails
        });
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
  const handleNameSave = async (name: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setCurrentProjectName(name);
        setShowNameModal(false);
        // Don't navigate back - just update the name
      }
    } catch (error) {
      console.error("Failed to save project name:", error);
    }
  };

  // Fetch version history
  const fetchVersions = async () => {
    if (!projectId) return;

    setIsLoadingVersions(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`);
      const data = await res.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error("Failed to fetch versions:", error);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  // Preview a version
  const previewVersion = async (version: { _id: string; versionNumber: number; createdAt: string }) => {
    if (!projectId || !version._id || !editor) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/versions/${version._id}`);
      const data = await res.json();

      if (data.version) {
        // Store current live state if this is the first version view
        if (!viewingVersion) {
          setLiveGeneratedHtml(generatedHtml);
          // Also save current canvas state
          const currentRecords = editor.store.allRecords();
          setLiveCanvasData(currentRecords);
        }

        setViewingVersion({
          _id: version._id,
          versionNumber: version.versionNumber,
          createdAt: version.createdAt,
          generatedHtml: data.version.generatedHtml || "",
        });

        // Set the version's HTML for preview
        setGeneratedHtml(data.version.generatedHtml || "");

        // Load the version's canvas data if available
        if (data.version.canvasData?.records && data.version.canvasData.records.length > 0) {
          // Clear current canvas
          const allShapeIds = editor.getCurrentPageShapeIds();
          if (allShapeIds.size > 0) {
            editor.deleteShapes(Array.from(allShapeIds));
          }
          // Load version's canvas
          const records = data.version.canvasData.records.map((record: any) => {
            const sanitized = {
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

        // Auto-switch to split view so user can see the preview
        setViewMode('split');
        setShowHistory(false);
      }
    } catch (error) {
      console.error("Failed to preview version:", error);
    }
  };

  // Confirm and restore version
  const confirmRestore = async () => {
    if (!viewingVersion || !projectId || !editor) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/versions/${viewingVersion._id}`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.project) {
        if (data.project.canvasData?.records) {
          const allShapeIds = editor.getCurrentPageShapeIds();
          if (allShapeIds.size > 0) {
            editor.deleteShapes(Array.from(allShapeIds));
          }

          const records = data.project.canvasData.records.map((record: any) => {
            const sanitized = {
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

        if (data.project.generatedHtml) {
          setGeneratedHtml(data.project.generatedHtml);
        }

        setViewingVersion(null);
        setLiveGeneratedHtml(data.project.generatedHtml || "");
        fetchVersions();
      }
    } catch (error) {
      console.error("Failed to restore version:", error);
    }
  };

  const exitVersionPreview = async () => {
    if (!editor) return;

    // Restore live HTML
    setGeneratedHtml(liveGeneratedHtml);

    // Restore live canvas data if we have it
    if (liveCanvasData && liveCanvasData.length > 0) {
      // Clear current canvas
      const allShapeIds = editor.getCurrentPageShapeIds();
      if (allShapeIds.size > 0) {
        editor.deleteShapes(Array.from(allShapeIds));
      }
      // Restore live canvas
      const records = liveCanvasData.map((record: any) => {
        const sanitized = {
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

    setViewingVersion(null);
    setLiveCanvasData(null);
  };

  // Load versions when panel opens
  useEffect(() => {
    if (showHistory && projectId) {
      fetchVersions();
    }
  }, [showHistory, projectId]);

  // Handle clear canvas
  const handleClearCanvas = useCallback(() => {
    if (!editor) return;
    if (confirm("Are you sure you want to clear the canvas? This cannot be undone.")) {
      const shapeIds = editor.getCurrentPageShapeIds();
      if (shapeIds.size > 0) {
        editor.deleteShapes(Array.from(shapeIds));
        // Force an immediate save
        saveCanvas(editor);
      }
    }
  }, [editor, projectId]);



  const handleGenerate = async (isRegenerate = false) => {
    if (isGenerating) return;

    if (!editor) {
      alert("Canvas not ready yet");
      return;
    }

    setGenerating(true);
    console.log(isRegenerate ? "🔄 Regenerating website..." : "🚀 Generating website...");

    // Immediate save to ensure DB is in sync before we start heavy processing
    if (editor && projectId) {
      await saveCanvas(editor);
    }

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

            try {
              // Send to API with style settings and existing HTML for regeneration
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
                // Log the AI's analysis
                if (data.analysis) {
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

                // Save version
                if (projectId) {
                  const allRecords = editor?.store.allRecords() || [];
                  await fetch(`/api/projects/${projectId}/versions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      canvasData: { records: allRecords },
                      generatedHtml: fullHtml,
                    }),
                  });
                  if (showHistory) fetchVersions();

                  // Also update the main project document with the new HTML
                  await fetch(`/api/projects/${projectId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      generatedHtml: fullHtml,
                    }),
                  });
                }

                // Auto-switch to split view if in canvas-only mode
                if (viewMode === 'canvas') {
                  setViewMode('split');
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
        } catch (err) {
          console.error("Canvas conversion error:", err);
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
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.leftSection}>
          <button onClick={handleBack} className={styles.iconBtn} title="Back to dashboard">
            <ArrowLeft size={20} />
          </button>
          <button onClick={handleClearCanvas} className={styles.iconBtn} title="Clear Canvas" style={{ color: '#ef4444' }}>
            <RotateCcw size={18} />
          </button>
          <div className={styles.actionTabs}>
            <button
              className={`${styles.secondaryBtn} ${showSettings ? styles.activeBtn : ''}`}
              title="Style Settings"
              onClick={() => {
                setShowSettings(!showSettings);
                setShowHistory(false);
              }}
            >
              <Settings size={14} />
              <span>Settings</span>
            </button>
            <button
              className={`${styles.secondaryBtn} ${showHistory ? styles.activeBtn : ''}`}
              onClick={() => {
                setShowHistory(!showHistory);
                setShowSettings(false);
              }}
              title="Version History"
            >
              <History size={14} />
              <span>History</span>
            </button>
          </div>

          {/* Editable Project Title */}
          <div className={styles.projectTitleSection}>
            {isEditingTitle ? (
              <input
                type="text"
                className={styles.projectTitleInput}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={() => {
                  if (editedTitle.trim()) {
                    handleNameSave(editedTitle.trim());
                  }
                  setIsEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editedTitle.trim()) {
                      handleNameSave(editedTitle.trim());
                    }
                    setIsEditingTitle(false);
                  } else if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                    setEditedTitle(currentProjectName);
                  }
                }}
                autoFocus
              />
            ) : (
              <div className={styles.projectTitleDisplay}>
                <span className={styles.projectTitle}>{currentProjectName}</span>
                <button
                  className={styles.editTitleBtn}
                  onClick={() => {
                    setEditedTitle(currentProjectName);
                    setIsEditingTitle(true);
                  }}
                  title="Rename project"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.centerSection}>
          <div className={styles.actionTabs}>
            <button
              className={`${styles.secondaryBtn} ${viewMode === 'canvas' ? styles.activeBtn : ''}`}
              onClick={() => setViewMode('canvas')}
            >
              <Layout size={14} />
              <span>Canvas</span>
            </button>
            <button
              className={`${styles.secondaryBtn} ${viewMode === 'split' ? styles.activeBtn : ''}`}
              onClick={() => setViewMode('split')}
            >
              <Columns size={14} />
              <span>Split View</span>
            </button>
            <button
              className={`${styles.secondaryBtn} ${viewMode === 'preview' ? styles.activeBtn : ''}`}
              onClick={() => setViewMode('preview')}
            >
              <Eye size={14} />
              <span>Preview</span>
            </button>

          </div>
        </div>

        <div className={styles.rightSection}>
          <button className={styles.deployBtn} onClick={handleDeploy} title="Deploy to Vercel">
            <Rocket size={14} />
            <span>Deploy</span>
          </button>

          <div className={styles.actionTabs}>
            <button
              className={styles.secondaryBtn}
              onClick={handleRegenerate}
              title="Regenerate"
              disabled={isGenerating}
            >
              <RotateCw size={14} />
              <span>Regenerate</span>
            </button>

            <button
              className={styles.generateBtn}
              onClick={() => handleGenerate()}
              disabled={isGenerating}
              style={{ opacity: isGenerating ? 0.7 : 1 }}
            >
              {isGenerating ? <Loader2 size={14} className={styles.spinning} /> : <Send size={14} />}
              <span>{isGenerating ? "Generating..." : "Generate"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainArea}>
        {/* Vertical Settings Panel */}
        <div className={`${styles.verticalSettings} ${showSettings ? styles.open : ''}`}>
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

        {/* Vertical Version History Panel */}
        <div className={`${styles.verticalSettings} ${showHistory ? styles.open : ''}`}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
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

        <div className={styles.splitContainer} ref={containerRef}>
          {/* tldraw Canvas */}
          <div
            className={`${styles.canvasSection} ${viewMode === 'canvas' ? styles.fullWidth : ''} ${viewMode === 'preview' ? styles.hidden : ''}`}
            style={viewMode === 'split' ? { width: `${splitPosition}%`, flex: 'none' } : undefined}
          >
            <Tldraw
              key={projectId || 'new-project'}
              onMount={handleMount}
              persistenceKey={projectId ? `webber-project-${projectId}` : undefined}
            />

            {/* Welcome Overlay - disappears on first action */}
            {showWelcome && (
              <div className={styles.welcomeOverlay} onClick={() => setShowWelcome(false)}>
                {/* Arrow pointing to menu/settings */}
                <div className={styles.hintTopLeft}>
                  <svg className={styles.arrowCurved} width="60" height="50" viewBox="0 0 60 50">
                    <path d="M50 45 Q30 45 20 25 Q15 15 5 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M5 10 L10 15 M5 10 L12 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className={styles.hintText}>Export, preferences, languages, ...</span>
                </div>

                {/* Arrow pointing down to toolbar */}
                <div className={styles.hintTopCenter}>
                  <span className={styles.hintTextMove}>To move canvas, use the <kbd>hand tool</kbd>  !</span>
                  <svg className={styles.arrowUp} width="40" height="60" viewBox="0 0 40 60">
                    <path d="M20 0 L20 50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M20 0 L15 8 M20 0 L25 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Pick a tool hint pointing down */}
                <div className={styles.hintToolPicker}>
                  <svg className={styles.arrowDown} width="40" height="60" viewBox="0 0 40 60">
                    <path d="M20 60 L20 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M20 60 L15 52 M20 60 L25 52" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className={styles.hintText}>Pick a tool <br />& Start drawing :)</span>
                </div>

                {/* Center branding */}
                <div className={styles.welcomeCenter}>
                  <h1 className={styles.welcomeLogo}>SKETCHY</h1>
                  <p className={styles.welcomeSubtext}>Draw it. Build it. Ship it.</p>
                </div>

                {/* Squiggly arrow pointing to AI sidebar */}
                <div className={styles.hintSidebar}>
                  <span className={styles.hintTextSidebar}>Make your ideas<br /><strong>BETTER</strong> with Gemini ;)</span>
                  <svg className={styles.arrowSquiggly} width="190" height="40" viewBox="0 0 190 40">
                    <path d="M0 20 Q15 8 30 20 Q45 32 60 20 Q75 8 90 20 Q105 32 120 20 Q135 8 150 20 Q165 32 175 20 L185 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M185 20 L178 14 M185 20 L178 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            )}
          </div>

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
          <div
            className={`${styles.previewSection} ${viewMode === 'preview' ? styles.fullWidth : ''} ${viewMode === 'canvas' ? styles.hidden : ''}`}
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
          onHtmlUpdate={async (newHtml: string) => {
            setGeneratedHtml(newHtml);
            if (projectId) {
              await fetch(`/api/projects/${projectId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ generatedHtml: newHtml }),
              });
            }
          }}

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
                        href={githubUrl || undefined}
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
                    href={deployedUrl || undefined}
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

      {/* Name Prompt Modal */}
      <NamePromptModal
        isOpen={showNameModal}
        currentName={currentProjectName}
        onSave={handleNameSave}
        onCancel={() => setShowNameModal(false)}
        onDiscard={async () => {
          // Delete the project from database
          if (projectId) {
            try {
              await fetch(`/api/projects/${projectId}`, {
                method: "DELETE",
              });
            } catch (error) {
              console.error("Failed to delete project:", error);
            }
          }
          // Navigate back to dashboard
          onBack();
        }}
      />
    </div>
  );
}
