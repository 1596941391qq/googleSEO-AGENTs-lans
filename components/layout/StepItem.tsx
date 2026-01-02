
import React from 'react';

interface StepItemProps {
  number: number;
  label: string;
  active: boolean;
  isDarkTheme?: boolean;
}

export const StepItem: React.FC<StepItemProps> = ({ number, label, active, isDarkTheme = true }) => (
  <div
    className={`flex items-center space-x-3 transition-all ${
      active ? "opacity-100" : "opacity-30"
    }`}
  >
    <div
      className={`text-xs font-black ${
        active
          ? "text-emerald-500"
          : isDarkTheme
          ? "text-neutral-500"
          : "text-gray-500"
      }`}
    >
      {number}.
    </div>
    <span
      className={`text-xs font-bold tracking-widest uppercase ${
        active
          ? isDarkTheme
            ? "text-white"
            : "text-gray-900"
          : isDarkTheme
          ? "text-neutral-600"
          : "text-gray-500"
      }`}
    >
      {label}
    </span>
  </div>
);
