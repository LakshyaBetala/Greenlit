"use client";

import React, { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  nodes: { id: string; label: string }[];
  edges: { source: string; target: string; label?: string }[];
}

export default function MermaidDiagram({ nodes, edges }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    const renderDiagram = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#18181b",
            primaryTextColor: "#fafaf9",
            primaryBorderColor: "#e2c044",
            lineColor: "#52525b",
            secondaryColor: "#0f0f11",
            tertiaryColor: "#09090b",
            fontFamily: "ui-monospace, 'Geist Mono', monospace",
            fontSize: "13px",
            nodeBorder: "#e2c044",
          },
        });

        // Build the Mermaid graph definition
        let graphDef = "graph LR\n";
        nodes.forEach((node) => {
          graphDef += `  ${node.id}["${node.id}\\n${node.label}"]\n`;
        });
        edges.forEach((edge) => {
          graphDef += `  ${edge.source} --> ${edge.target}\n`;
        });

        // Architect's Ink styling
        nodes.forEach((node) => {
          graphDef += `  style ${node.id} fill:#0f0f11,stroke:#e2c044,stroke-width:1.5px,color:#fafaf9\n`;
        });

        const { svg: renderedSvg } = await mermaid.render(
          `mermaid-${Date.now()}`,
          graphDef
        );
        setSvg(renderedSvg);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(true);
      }
    };

    renderDiagram();
  }, [nodes, edges]);

  // Fallback: CSS-based diagram
  if (error || !nodes || nodes.length === 0) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-4 py-8">
        {nodes?.map((node, idx) => (
          <React.Fragment key={node.id}>
            <div className="surface-elevated px-5 py-4 text-center min-w-[120px]"
                 style={{
                   borderColor: "rgba(226, 192, 68, 0.2)",
                   borderRadius: "var(--radius-md)",
                   transition: "transform 200ms var(--ease-out), border-color 200ms var(--ease-out)",
                   cursor: "default",
                 }}
                 onMouseEnter={(e) => {
                   e.currentTarget.style.transform = "translateY(-2px)";
                   e.currentTarget.style.borderColor = "var(--ink-gold)";
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.transform = "translateY(0)";
                   e.currentTarget.style.borderColor = "rgba(226, 192, 68, 0.2)";
                 }}>
              <div style={{ fontWeight: 600, color: "var(--ink-gold)", marginBottom: "4px", fontSize: "0.875rem" }}>
                {node.id}
              </div>
              <div className="text-code" style={{ fontSize: "0.75rem", color: "var(--ink-dim)" }}>
                {node.label}
              </div>
            </div>
            {idx < nodes.length - 1 && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-dim)" strokeWidth="1.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto py-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
