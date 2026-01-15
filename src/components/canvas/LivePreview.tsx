"use client";

interface LivePreviewProps {
    htmlContent: string;
}

export default function LivePreview({ htmlContent }: LivePreviewProps) {
    return (
        <div style={{
            flex: 1,
            backgroundColor: 'white',
            borderLeft: '1px solid #e5e7eb',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                padding: '1rem',
                borderBottom: '1px solid #e5e7eb',
                background: '#f9fafb',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#374151'
            }}>
                Live Preview
            </div>
            <iframe
                srcDoc={htmlContent || '<html><body style="margin:0;padding:2rem;font-family:system-ui;color:#999;text-align:center;">Draw something and click Generate to see preview</body></html>'}
                style={{
                    width: '100%',
                    height: 'calc(100% - 49px)',
                    border: 'none'
                }}
                title="Live Preview"
                sandbox="allow-scripts allow-same-origin"
            />
        </div>
    );
}
