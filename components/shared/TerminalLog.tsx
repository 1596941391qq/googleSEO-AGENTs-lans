import React, { useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import { LogEntry } from '../../types';

interface TerminalLogProps {
  logs: LogEntry[];
  isDarkTheme?: boolean;
}

export function TerminalLog({ logs, isDarkTheme = true }: TerminalLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      className={`rounded-lg p-3 font-mono text-xs h-full overflow-hidden flex flex-col shadow-inner ${
        isDarkTheme
          ? 'bg-[#0a0a0a] text-emerald-400 border border-white/10'
          : 'bg-white text-emerald-600 border border-gray-200'
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b pb-2 mb-2 uppercase tracking-wider text-[10px] ${
          isDarkTheme ? 'border-emerald-500/30 text-white/70' : 'border-gray-200 text-gray-500'
        }`}
      >
        <Terminal className="w-3 h-3 text-emerald-500" />
        <span>System Logs</span>
      </div>
      <div ref={scrollRef} className="overflow-y-auto custom-scrollbar flex-1 space-y-1">
        {logs.map((log, i) => (
          <div
            key={i}
            className={`flex gap-2 ${
              log.type === 'error'
                ? isDarkTheme
                  ? 'text-red-400'
                  : 'text-red-600'
                : log.type === 'api'
                ? isDarkTheme
                  ? 'text-emerald-400'
                  : 'text-emerald-600'
                : isDarkTheme
                ? 'text-white'
                : 'text-gray-700'
            }`}
          >
            <span className={`w-14 shrink-0 ${isDarkTheme ? 'text-white/60' : 'text-gray-500'}`}>
              [{log.timestamp.split(' ')[0]}]
            </span>
            <span className="break-words">
              {log.type === 'api' ? '> ' : ''}
              {log.message}
            </span>
          </div>
        ))}
        <div className="animate-pulse">_</div>
      </div>
    </div>
  );
}
