
import React, { useState, useEffect } from 'react';
import { Search, Languages, FileText, X, CheckCircle, Loader2 } from 'lucide-react';
import { TaskState, UILanguage } from '../../types';

interface TaskTabProps {
  task: TaskState;
  isActive: boolean;
  onSwitch: () => void;
  onClose: (e: React.MouseEvent) => void;
  onRename: (name: string) => void;
  uiLanguage: UILanguage;
}

export const TaskTab: React.FC<TaskTabProps> = ({
  task,
  isActive,
  onSwitch,
  onClose,
  onRename,
  uiLanguage,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);

  useEffect(() => {
    setEditName(task.name);
  }, [task.name]);

  const handleDoubleClick = () => {
    if (isActive) {
      setIsEditing(true);
    }
  };

  const handleSaveName = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setEditName(task.name);
      setIsEditing(false);
    }
  };

  const isRunning =
    task.miningState?.isMining || task.deepDiveState?.isDeepDiving;
  const hasResults =
    (task.miningState?.keywords && task.miningState.keywords.length > 0) ||
    (task.batchState?.batchKeywords &&
      task.batchState.batchKeywords.length > 0) ||
    (task.deepDiveState?.currentStrategyReport !== null &&
      task.deepDiveState?.currentStrategyReport !== undefined);

  const TaskIcon =
    task.type === "mining"
      ? Search
      : task.type === "batch"
      ? Languages
      : FileText;

  return (
    <div
      onClick={onSwitch}
      onDoubleClick={handleDoubleClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-t-md border-t border-x cursor-pointer
        transition-all flex-shrink-0 max-w-[200px] group
        ${
          isActive
            ? "bg-black/80 border-emerald-500/30 text-white"
            : "bg-black/40 border-emerald-500/10 text-slate-400 hover:bg-black/60 hover:text-emerald-400"
        }
      `}
      title={task.name}
    >
      <TaskIcon
        className={`w-3.5 h-3.5 flex-shrink-0 ${
          isRunning ? "animate-pulse text-emerald-400" : ""
        }`}
      />

      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSaveName}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 min-w-0 bg-transparent outline-none text-xs font-medium border-b border-emerald-500/50 text-white"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-xs font-medium truncate min-w-0" title={task.name}>{task.name}</span>
      )}

      {isRunning && (
        <Loader2 className="w-3 h-3 animate-spin text-emerald-400 flex-shrink-0" />
      )}
      {!isRunning && hasResults && (
        <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
      )}

      <button
        onClick={onClose}
        className={`
          p-0.5 rounded hover:bg-red-500/20 transition-colors flex-shrink-0
          ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
        `}
        title={uiLanguage === "zh" ? "关闭任务" : "Close task"}
      >
        <X className="w-3 h-3 text-slate-400 hover:text-red-400" />
      </button>
    </div>
  );
};
