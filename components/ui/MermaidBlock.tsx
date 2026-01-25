import React, { useEffect, useMemo, useState } from "react";
import mermaid from "mermaid";
import { cn } from "../../lib/utils";

let mermaidInitialized = false;

const ensureMermaidInitialized = (isDarkTheme: boolean) => {
  const theme = isDarkTheme ? "dark" : "default";

  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme,
    });
    mermaidInitialized = true;
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    theme,
  });
};

interface MermaidBlockProps {
  code: string;
  isDarkTheme?: boolean;
  className?: string;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({
  code,
  isDarkTheme = false,
  className,
}) => {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const renderId = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2)}`,
    []
  );

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setSvg("");
    ensureMermaidInitialized(isDarkTheme);

    const normalizedCode = code.trim();
    const result = mermaid.render(renderId, normalizedCode);

    const handleResult = (value: any) => {
      const svgContent = value?.svg ?? value;
      if (!cancelled) {
        setSvg(svgContent);
      }
    };

    const handleError = (err: any) => {
      if (!cancelled) {
        setError(err?.message || "Mermaid render failed");
      }
    };

    if (result && typeof (result as Promise<any>).then === "function") {
      (result as Promise<any>).then(handleResult).catch(handleError);
    } else {
      handleResult(result);
    }

    return () => {
      cancelled = true;
    };
  }, [code, isDarkTheme, renderId]);

  if (error) {
    return (
      <pre
        className={cn(
          "my-4 overflow-x-auto rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200",
          className
        )}
      >
        {error}
        {"\n\n"}
        {code}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div
        className={cn(
          "my-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400",
          className
        )}
      >
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      className={cn("my-4 overflow-x-auto", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
