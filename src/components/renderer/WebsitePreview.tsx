"use client";

import { useStore } from "@/lib/store";
import { X, Download } from "lucide-react";
import styles from "./WebsitePreview.module.css";
import { useEffect, useRef } from "react";
import JSZip from "jszip";

export default function WebsitePreview() {
  const { activeWebsite, setActiveWebsite } = useStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Extract values safely (will be empty strings if null)
  const html = activeWebsite?.html || "";
  const css = activeWebsite?.css || "";
  const js = activeWebsite?.js || "";

  // useEffect MUST be called unconditionally (before any early returns)
  useEffect(() => {
    if (!activeWebsite) return; // Guard inside the effect instead
    
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>${css}</style>
            </head>
            <body>
              ${html}
              <script>${js}</script>
            </body>
          </html>
        `);
        doc.close();
      }
    }
  }, [activeWebsite, html, css, js]);

  const handleClose = () => {
    setActiveWebsite(null);
  };

  const handleDownload = async () => {
    if (!activeWebsite) return;
    
    const zip = new JSZip();
    zip.file("index.html", `
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    ${html}
    <script src="script.js"></script>
  </body>
</html>
    `);
    zip.file("style.css", css);
    zip.file("script.js", js);

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "webber-site.zip";
    a.click();
  };

  // Early return AFTER all hooks
  if (!activeWebsite) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.title}>
            <span className={styles.dot}></span>
            Generated Website
          </div>
          <div className={styles.actions}>
            <button onClick={handleDownload} className={styles.actionBtn}>
              <Download size={18} />
            </button>
            <button onClick={handleClose} className={styles.closeBtn}>
              <X size={20} />
            </button>
          </div>
        </header>
        <div className={styles.preview}>
          <iframe 
            ref={iframeRef} 
            className={styles.iframe} 
            title="Preview"
          />
        </div>
      </div>
    </div>
  );
}
