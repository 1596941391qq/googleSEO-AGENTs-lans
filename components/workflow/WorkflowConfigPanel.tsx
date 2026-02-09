import React, { useState, useEffect } from "react";
import {
  BrainCircuit,
  ArrowRight,
  Save,
  RefreshCw,
  FolderOpen,
  Trash2,
} from "lucide-react";
import { WorkflowConfig } from "../../types";

interface WorkflowConfigPanelProps {
  workflowDef: any;
  currentConfig: WorkflowConfig | null;
  allConfigs: WorkflowConfig[];
  onSave: (config: WorkflowConfig) => Promise<void>;
  onLoad: (configId: string) => void;
  onReset: () => void;
  onDelete: (configId: string) => Promise<void>;
  t: any;
  isDarkTheme?: boolean;
}

export const WorkflowConfigPanel: React.FC<WorkflowConfigPanelProps> = ({
  workflowDef,
  currentConfig,
  allConfigs,
  onSave,
  onLoad,
  onReset,
  onDelete,
  t,
  isDarkTheme = true,
}) => {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [configName, setConfigName] = useState("");
  const [nodes, setNodes] = useState(workflowDef.nodes);

  useEffect(() => {
    if (currentConfig) {
      setNodes(currentConfig.nodes);
    } else {
      setNodes(workflowDef.nodes);
    }
  }, [currentConfig, workflowDef]);

  const handleNodePromptChange = (nodeId: string, newPrompt: string) => {
    setNodes((prev: any[]) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, prompt: newPrompt } : node
      )
    );
  };

  const handleSaveConfig = async () => {
    if (!configName.trim()) {
      alert(t.configNamePlaceholder);
      return;
    }

    const newConfig: WorkflowConfig = {
      id: `${workflowDef.id}-${Date.now()}`,
      workflowId: workflowDef.id,
      name: configName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: JSON.parse(JSON.stringify(nodes)),
    };

    console.log("[handleSaveConfig] Calling onSave with:", newConfig);
    console.log("[handleSaveConfig] onSave function:", onSave);
    console.log("[handleSaveConfig] onSave type:", typeof onSave);

    if (!onSave || typeof onSave !== "function") {
      console.error("[handleSaveConfig] onSave is not a function!", onSave);
      alert("保存功能未正确初始化，请刷新页面重试");
      return;
    }

    try {
      console.log("[handleSaveConfig] About to call onSave...");
      await onSave(newConfig);
      console.log("[handleSaveConfig] onSave completed successfully");
      setConfigName("");
    } catch (error) {
      console.error("[handleSaveConfig] Save failed:", error);
      alert(`保存失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  };

  const handleResetToDefault = () => {
    if (confirm(t.resetToDefault + "?")) {
      setNodes(workflowDef.nodes);
      onReset();
    }
  };

  const workflowConfigs = allConfigs.filter(
    (c) => c.workflowId === workflowDef.id
  );

  return (
    <div
      className={`backdrop-blur-sm rounded-xl shadow-sm border p-6 mb-6 ${isDarkTheme
        ? "bg-black/20 border-emerald-500/20"
        : "bg-white border-emerald-200"
        }`}
    >
      <div className="mb-4">
        <h3
          className={`text-lg font-bold flex items-center gap-2 ${isDarkTheme ? "text-white" : "text-gray-900"
            }`}
        >
          <BrainCircuit className="w-5 h-5 text-emerald-400" />
          {workflowDef.name}
        </h3>
        <p
          className={`text-sm mt-1 ${isDarkTheme ? "text-slate-400" : "text-gray-600"
            }`}
        >
          {workflowDef.description}
        </p>
      </div>

      {/* Workflow Nodes Visualization */}
      <div className="space-y-3 mb-6">
        {nodes.map((node: any, index: number) => (
          <div key={node.id}>
            <div
              className={`p-4 rounded-lg border-2 ${node.type === "agent"
                ? isDarkTheme
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-emerald-300 bg-emerald-50"
                : isDarkTheme
                  ? "border-emerald-500/20 bg-black/40"
                  : "border-emerald-200 bg-gray-50"
                } ${!node.configurable ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${node.type === "agent"
                        ? "bg-emerald-500 text-black"
                        : isDarkTheme
                          ? "bg-slate-600 text-white"
                          : "bg-gray-600 text-white"
                        }`}
                    >
                      {node.type === "agent" ? t.agentNode : t.toolNode}
                    </span>
                    <span
                      className={`font-bold text-sm ${isDarkTheme ? "text-white" : "text-gray-900"
                        }`}
                    >
                      {node.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${node.configurable
                        ? isDarkTheme
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-emerald-100 text-emerald-700"
                        : isDarkTheme
                          ? "bg-slate-500/20 text-slate-400"
                          : "bg-gray-200 text-gray-600"
                        }`}
                    >
                      {node.configurable ? t.configurable : t.notConfigurable}
                    </span>
                  </div>
                  <p
                    className={`text-xs ${isDarkTheme ? "text-slate-400" : "text-gray-600"
                      }`}
                  >
                    {node.description}
                  </p>

                  {/* Editable Prompt Area */}
                  {node.configurable && node.type === "agent" && (
                    <div className="mt-3">
                      {editingNodeId === node.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={node.prompt || ""}
                            onChange={(e) =>
                              handleNodePromptChange(node.id, e.target.value)
                            }
                            className={`w-full h-32 p-2 text-xs font-mono border rounded focus:outline-none focus:ring-2 ${isDarkTheme
                              ? "border-emerald-500/30 bg-black/60 text-white placeholder:text-slate-500 focus:ring-emerald-500/50"
                              : "border-emerald-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-emerald-500"
                              }`}
                            placeholder={t.editPrompt}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingNodeId(null)}
                              className="px-3 py-1 bg-emerald-500 text-black rounded text-xs hover:bg-emerald-600"
                            >
                              {t.close}
                            </button>
                            <button
                              onClick={() => {
                                handleNodePromptChange(
                                  node.id,
                                  node.defaultPrompt || ""
                                );
                              }}
                              className="px-3 py-1 bg-slate-600 text-white rounded text-xs hover:bg-slate-500"
                            >
                              {t.resetToDefault}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => setEditingNodeId(node.id)}
                          className={`mt-2 p-2 border rounded cursor-pointer transition-colors ${isDarkTheme
                            ? "bg-black/60 border-emerald-500/30 hover:border-emerald-400"
                            : "bg-gray-50 border-emerald-300 hover:border-emerald-400"
                            }`}
                        >
                          <div
                            className={`text-[10px] mb-1 ${isDarkTheme ? "text-slate-500" : "text-gray-500"
                              }`}
                          >
                            {t.editPrompt}
                          </div>
                          <div
                            className={`text-xs line-clamp-2 font-mono ${isDarkTheme ? "text-slate-300" : "text-gray-700"
                              }`}
                          >
                            {node.prompt || "No prompt"}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Connector Arrow */}
            {index < nodes.length - 1 && (
              <div className="flex justify-center py-2">
                <ArrowRight className="w-5 h-5 text-emerald-500/30" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Configuration Management */}
      <div className="border-t border-emerald-500/20 pt-4 space-y-4">
        {/* Save New Config */}
        <div className="flex gap-2">
          <input
            type="text"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder={t.configNamePlaceholder}
            className={`flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 ${isDarkTheme
              ? "border-emerald-500/30 bg-black/60 text-white placeholder:text-slate-500 focus:ring-emerald-500/50"
              : "border-emerald-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-emerald-500"
              }`}
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("[Save Button] Clicked, calling handleSaveConfig");
              handleSaveConfig();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded hover:bg-emerald-600 text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            {t.saveWorkflowConfig}
          </button>
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            {t.resetToDefault}
          </button>
        </div>

        {/* Saved Configs List */}
        {workflowConfigs.length > 0 && (
          <div>
            <div
              className={`text-xs uppercase font-bold mb-2 ${isDarkTheme ? "text-slate-400" : "text-gray-600"
                }`}
            >
              {t.loadWorkflowConfig}
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
              {workflowConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`flex items-center justify-between p-2 rounded border ${currentConfig?.id === config.id
                    ? isDarkTheme
                      ? "border-emerald-500/50 bg-emerald-500/20"
                      : "border-emerald-400 bg-emerald-100"
                    : isDarkTheme
                      ? "border-emerald-500/20 bg-black/40"
                      : "border-emerald-200 bg-gray-50"
                    }`}
                >
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium ${isDarkTheme ? "text-white" : "text-gray-900"
                        }`}
                    >
                      {config.name}
                    </div>
                    <div
                      className={`text-xs ${isDarkTheme ? "text-slate-500" : "text-gray-500"
                        }`}
                    >
                      {new Date(config.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {currentConfig?.id === config.id && (
                      <span className="text-xs bg-emerald-500/30 text-emerald-400 px-2 py-1 rounded">
                        {t.currentlyUsing}
                      </span>
                    )}
                    <button
                      onClick={() => onLoad(config.id)}
                      className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30"
                      title={t.loadWorkflowConfig || "加载配置"}
                    >
                      <FolderOpen className="w-3 h-3" />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (
                          confirm(t.deleteConfirm || "确定要删除此配置吗？")
                        ) {
                          console.log(
                            "[WorkflowConfigPanel] Deleting config:",
                            config.id
                          );
                          try {
                            await onDelete(config.id);
                          } catch (error) {
                            console.error(
                              "[WorkflowConfigPanel] Delete failed:",
                              error
                            );
                          }
                        }
                      }}
                      className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30"
                      title={t.deleteConfig || "删除配置"}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {workflowConfigs.length === 0 && (
          <div
            className={`text-center py-4 text-sm ${isDarkTheme ? "text-slate-500" : "text-gray-500"
              }`}
          >
            {t.noSavedConfigs}
          </div>
        )}
      </div>
    </div>
  );
};
