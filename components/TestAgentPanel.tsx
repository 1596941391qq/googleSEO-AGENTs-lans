import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Loader2, Play, Terminal, Bug } from "lucide-react";
import { cn } from "../lib/utils";

interface TestAgentPanelProps {
  isDarkTheme: boolean;
  onClose: () => void;
}

type AgentMode = 'agent-1' | 'agent-2' | 'agent-3' | 'deep-dive' | 'se-ranking';

export const TestAgentPanel: React.FC<TestAgentPanelProps> = ({ isDarkTheme, onClose }) => {
  const [mode, setMode] = useState<AgentMode>('agent-1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [seedKeyword, setSeedKeyword] = useState("best coffee machine");
  const [keyword, setKeyword] = useState("seo strategy");
  const [keywordsList, setKeywordsList] = useState("seo tools, keyword research, backlink analysis");
  const [structure, setStructure] = useState<string>(
    JSON.stringify([
      { header: "Introduction", description: "What is SEO?" },
      { header: "Benefits", description: "Why do you need it?" }
    ], null, 2)
  );

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let input: any = {};

      switch (mode) {
        case 'agent-1':
          input = { seedKeyword };
          break;
        case 'agent-2':
        case 'deep-dive':
          input = { keyword };
          break;
        case 'agent-3':
          input = { keyword, structure: JSON.parse(structure) };
          break;
        case 'se-ranking':
          input = { keywords: keywordsList.split(',').map(k => k.trim()) };
          break;
      }

      const response = await fetch('/api/test-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode, input }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={cn("text-2xl font-bold flex items-center gap-2", isDarkTheme ? "text-white" : "text-gray-900")}>
            <Bug className="w-6 h-6 text-emerald-500" />
            Test Agent Mode
          </h1>
          <p className={cn("text-sm mt-1", isDarkTheme ? "text-slate-400" : "text-gray-600")}>
            Local development utility to test individual agents with mock data.
          </p>
        </div>
        <Button variant="outline" onClick={onClose} className={isDarkTheme ? "border-slate-700 hover:bg-slate-800 text-slate-300" : ""}>
          Back to App
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className={cn(isDarkTheme ? "bg-slate-900 border-slate-800" : "bg-white")}>
            <CardHeader>
              <CardTitle className={isDarkTheme ? "text-white" : ""}>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", isDarkTheme ? "text-slate-300" : "")}>Select Agent</label>
                <Select value={mode} onValueChange={(v) => setMode(v as AgentMode)}>
                  <SelectTrigger className={isDarkTheme ? "bg-slate-950 border-slate-800 text-white" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent-1">Agent 1: Keyword Miner</SelectItem>
                    <SelectItem value="agent-2">Agent 2: SEO Researcher</SelectItem>
                    <SelectItem value="agent-3">Agent 3: Content Writer</SelectItem>
                    <SelectItem value="deep-dive">Deep Dive Strategy</SelectItem>
                    <SelectItem value="se-ranking">SE Ranking Tool</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode === 'agent-1' && (
                <div className="space-y-2">
                  <label className={cn("text-sm font-medium leading-none", isDarkTheme ? "text-slate-300" : "")}>Seed Keyword</label>
                  <Input 
                    value={seedKeyword} 
                    onChange={(e) => setSeedKeyword(e.target.value)}
                    className={isDarkTheme ? "bg-slate-950 border-slate-800 text-white" : ""}
                  />
                </div>
              )}

              {(mode === 'agent-2' || mode === 'deep-dive' || mode === 'agent-3') && (
                <div className="space-y-2">
                  <label className={cn("text-sm font-medium leading-none", isDarkTheme ? "text-slate-300" : "")}>Target Keyword</label>
                  <Input 
                    value={keyword} 
                    onChange={(e) => setKeyword(e.target.value)}
                    className={isDarkTheme ? "bg-slate-950 border-slate-800 text-white" : ""}
                  />
                </div>
              )}

              {mode === 'agent-3' && (
                <div className="space-y-2">
                  <label className={cn("text-sm font-medium leading-none", isDarkTheme ? "text-slate-300" : "")}>Content Structure (JSON)</label>
                  <textarea 
                    value={structure}
                    onChange={(e) => setStructure(e.target.value)}
                    rows={8}
                    className={cn(
                      "flex min-h-[80px] w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-xs",
                      isDarkTheme ? "bg-slate-950 border-slate-800 text-white" : "bg-background"
                    )}
                  />
                </div>
              )}

              {mode === 'se-ranking' && (
                <div className="space-y-2">
                  <label className={cn("text-sm font-medium leading-none", isDarkTheme ? "text-slate-300" : "")}>Keywords (comma separated)</label>
                  <textarea 
                    value={keywordsList}
                    onChange={(e) => setKeywordsList(e.target.value)}
                    rows={4}
                    className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        isDarkTheme ? "bg-slate-950 border-slate-800 text-white" : "bg-background"
                    )}
                  />
                </div>
              )}

              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
                onClick={handleTest}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Run Test Agent
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Output */}
        <div className="lg:col-span-2">
          <Card className={cn("h-full flex flex-col", isDarkTheme ? "bg-slate-900 border-slate-800" : "bg-white")}>
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-500" />
                <CardTitle className={isDarkTheme ? "text-white" : ""}>Output Console</CardTitle>
              </div>
              <CardDescription>
                Raw JSON response from the agent endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative min-h-[500px]">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    <span>Processing...</span>
                  </div>
                </div>
              )}
              
              <div className="absolute inset-0 overflow-auto p-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-4">
                    <strong>Error:</strong> {error}
                  </div>
                )}
                
                {result ? (
                  <pre className={cn("text-xs font-mono whitespace-pre-wrap", isDarkTheme ? "text-emerald-400" : "text-emerald-800")}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                    Run a test to see output here...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
