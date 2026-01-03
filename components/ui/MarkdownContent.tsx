import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib/utils';

interface MarkdownContentProps {
  content: string;
  isDarkTheme?: boolean;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  isDarkTheme = false,
}) => {
  const textColor = isDarkTheme ? "text-slate-300" : "text-slate-700";
  const headingColor = isDarkTheme ? "text-white" : "text-slate-900";
  const borderColor = isDarkTheme ? "border-white/20" : "border-slate-300";
  const codeBg = isDarkTheme ? "bg-white/10 border-white/5" : "bg-slate-100 border-slate-300";
  const blockquoteBorder = isDarkTheme ? "border-l-emerald-500/50" : "border-l-emerald-600";

  return (
    <div className={cn("markdown-content", textColor)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 标题
          h1: ({ children }) => (
            <h1 className={cn("text-3xl font-bold mt-10 mb-4", headingColor)}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={cn("text-2xl font-bold mt-8 mb-3", headingColor)}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={cn("text-xl font-bold mt-6 mb-2", headingColor)}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className={cn("text-lg font-bold mt-4 mb-2", headingColor)}>
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className={cn("text-base font-bold mt-3 mb-2", headingColor)}>
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className={cn("text-sm font-bold mt-2 mb-1", headingColor)}>
              {children}
            </h6>
          ),
          // 段落
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed">
              {children}
            </p>
          ),
          // 列表
          ul: ({ children }) => (
            <ul className="my-4 ml-6 list-disc space-y-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-6 list-decimal space-y-2">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1">
              {children}
            </li>
          ),
          // 强调
          strong: ({ children }) => (
            <strong className={cn("font-bold", headingColor)}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic">
              {children}
            </em>
          ),
          // 代码
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            return isInline ? (
              <code
                className={cn(
                  "px-1.5 py-0.5 rounded text-sm font-mono",
                  codeBg,
                  textColor
                )}
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className={cn(
                  "block p-4 rounded-lg text-sm font-mono overflow-x-auto my-4",
                  codeBg,
                  textColor
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto">
              {children}
            </pre>
          ),
          // 分割线
          hr: () => (
            <hr className={cn("my-8 border-t", borderColor)} />
          ),
          // 引用
          blockquote: ({ children }) => (
            <blockquote className={cn(
              "my-4 pl-4 border-l-4 italic",
              blockquoteBorder,
              isDarkTheme ? "text-slate-400" : "text-slate-600"
            )}>
              {children}
            </blockquote>
          ),
          // 链接
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "underline hover:no-underline transition-colors",
                isDarkTheme ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-600 hover:text-emerald-700"
              )}
            >
              {children}
            </a>
          ),
          // 表格
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className={cn(
                "min-w-full border-collapse",
                borderColor
              )}>
                {children}
              </table>
            </div>
          ),
          thead: () => (
            <thead className={cn("bg-white/5", !isDarkTheme && "bg-slate-100")}>
            </thead>
          ),
          tbody: () => (
            <tbody>
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className={cn("border-b", borderColor)}>
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className={cn(
              "px-4 py-2 text-left font-bold",
              headingColor
            )}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={cn("px-4 py-2", textColor)}>
              {children}
            </td>
          ),
          // 图片
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="my-4 rounded-lg max-w-full h-auto"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
