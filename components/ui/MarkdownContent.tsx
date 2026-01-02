
import React from 'react';

const parseMarkdown = (text: string, isDarkTheme: boolean = false): string => {
  if (!text) return "";
  let html = text;
  const textColor = isDarkTheme ? "text-white" : "text-slate-900";
  html = html.replace(/^### (.*$)/gim, `<h3 class="text-xl font-bold ${textColor} mt-6 mb-2">$1</h3>`);
  html = html.replace(/^## (.*$)/gim, `<h2 class="text-2xl font-bold ${textColor} mt-8 mb-3">$1</h2>`);
  html = html.replace(/^# (.*$)/gim, `<h1 class="text-3xl font-bold ${textColor} mt-10 mb-4">$1</h1>`);
  html = html.replace(/\*\*(.+?)\*\*/g, `<strong class="font-bold ${textColor}">$1</strong>`);
  html = html.replace(/__(.+?)__/g, `<strong class="font-bold ${textColor}">$1</strong>`);
  html = html.replace(/\*(.+?)\*/g, `<em class="italic">$1</em>`);
  html = html.replace(/_(.+?)_/g, `<em class="italic">$1</em>`);
  html = html.replace(/`(.*?)`/g, `<code class="px-1.5 py-0.5 rounded text-sm font-mono bg-white/10 border border-white/5">$1</code>`);
  
  // Lists
  html = html.replace(/^\- (.*$)/gim, `<li class="ml-4 list-disc">$1</li>`);
  html = html.replace(/^\* (.*$)/gim, `<li class="ml-4 list-disc">$1</li>`);
  html = html.replace(/((?:<li.*>.*<\/li>\s*)+)/g, `<ul class="my-4 space-y-2">$1</ul>`);
  
  // Paragraphs (simplified)
  html = html.split('\n\n').map(p => {
    if (p.trim().startsWith('<')) return p;
    return `<p class="mb-4 leading-relaxed">${p.trim()}</p>`;
  }).join('\n');

  return html;
};

interface MarkdownContentProps {
  content: string;
  isDarkTheme?: boolean;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  isDarkTheme = false,
}) => {
  return (
    <div
      className={`markdown-content ${isDarkTheme ? "text-slate-300" : "text-slate-700"}`}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content, isDarkTheme) }}
    />
  );
};
