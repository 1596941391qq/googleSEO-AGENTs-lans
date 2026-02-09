import React, { useState } from 'react';
import { Search, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { KeywordData, ProbabilityLevel } from '../../types';

interface SerpPreviewProps {
  keywords: KeywordData[];
  label: string;
  disclaimer: string;
  t: any;
  isDarkTheme?: boolean;
}

export function SerpPreview({
  keywords,
  label,
  disclaimer,
  t,
  isDarkTheme = true,
}: SerpPreviewProps) {
  const [isOpen, setIsOpen] = useState(true); // Default open

  if (!keywords || keywords.length === 0) return null;

  return (
    <div
      className={`mt-2 border rounded-md overflow-hidden ${
        isDarkTheme ? 'border-white/10 bg-black/40' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-2 text-xs font-medium transition-colors ${
          isDarkTheme
            ? 'bg-black hover:bg-emerald-500/20 text-white border border-emerald-500/20'
            : 'bg-white hover:bg-gray-100 text-gray-700'
        }`}
      >
        <div className="flex items-center gap-2">
          <Search className="w-3 h-3" />
          {label} ({keywords.length})
        </div>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div
          className={`p-2 space-y-3 border-t ${
            isDarkTheme ? 'bg-black border-emerald-500/20' : 'bg-white border-gray-200'
          }`}
        >
          <div
            className={`text-[10px] px-2 italic mb-2 ${
              isDarkTheme ? 'text-amber-400' : 'text-amber-600'
            }`}
          >
            {disclaimer}
          </div>
          {keywords.map((kw) => (
            <div
              key={kw.id}
              className={`border-b last:border-0 pb-2 last:pb-0 ${
                isDarkTheme ? 'border-white/10' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className={`font-bold text-xs ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                  {kw.keyword}
                </div>
                <div
                  className={`text-[10px] px-1.5 rounded-full ${
                    kw.probability === ProbabilityLevel.HIGH
                      ? isDarkTheme
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-emerald-100 text-emerald-700'
                      : kw.probability === ProbabilityLevel.MEDIUM
                      ? isDarkTheme
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-yellow-100 text-yellow-700'
                      : isDarkTheme
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {kw.probability}
                </div>
              </div>
              {kw.topSerpSnippets && kw.topSerpSnippets.length > 0 ? (
                <div
                  className={`space-y-1.5 pl-2 border-l-2 ${
                    isDarkTheme ? 'border-white/10' : 'border-gray-200'
                  }`}
                >
                  {kw.topSerpSnippets.slice(0, 3).map((snippet, idx) => (
                    <div key={idx} className="text-[10px]">
                      <div
                        className={`truncate hover:underline cursor-pointer ${
                          isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'
                        }`}
                        title={snippet.title}
                      >
                        {snippet.title}
                      </div>
                      <div
                        className={`truncate text-[9px] ${
                          isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'
                        }`}
                      >
                        {snippet.url}
                      </div>
                      <div className={`line-clamp-2 ${isDarkTheme ? 'text-white/90' : 'text-gray-600'}`}>
                        {snippet.snippet}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={`text-[10px] italic pl-2 border-l-2 ${
                    isDarkTheme ? 'text-white/70 border-emerald-500/30' : 'text-gray-500 border-gray-200'
                  }`}
                >
                  No SERP snippets returned. (May be zero results or API missing data)
                </div>
              )}
              {/* Verify Button in Stream */}
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(kw.keyword)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-2 flex w-full items-center justify-center gap-1 text-[10px] py-1 rounded border transition-colors font-medium ${
                  isDarkTheme
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
                }`}
              >
                <ExternalLink className="w-3 h-3" />
                {t.verifyBtn}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
