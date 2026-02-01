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

    const renderDiagram = async () => {
      try {
        // 尝试解析语法
        // 注意：parse 在 v10+ 是异步的，且如果失败会抛出错误
        // 设置 suppressErrors: true 防止 mermaid 直接修改 DOM 插入错误信息
        mermaid.parseError = (err) => {
          // 捕获 parse 阶段的同步错误（如果有）
          console.error("Mermaid Parse Error:", err);
        };

        // 验证语法
        if (await mermaid.parse(normalizedCode)) {
          // 语法有效，进行渲染
          const result = await mermaid.render(renderId, normalizedCode);
          const svgContent = typeof result === 'string' ? result : result.svg;

          if (!cancelled) {
            setSvg(svgContent);
          }
        }
      } catch (err: any) {
        console.error("Mermaid Render Failed:", err);
        if (!cancelled) {
          // 提取更有用的错误信息
          const errorMessage = err?.message || "Syntax error";
          setError(errorMessage);
        }
      }
    };

    renderDiagram();

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
