import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, Play, Search, Bug, Wifi, Terminal, Globe, CheckCircle2, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { SafeStreamdown } from "@/components/SafeStreamdown";

const CATEGORY_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  recon: { icon: <Search className="w-4 h-4" />, label: "Reconnaissance", color: "text-green-400" },
  exploitation: { icon: <Bug className="w-4 h-4" />, label: "Exploitation", color: "text-red-400" },
  wireless: { icon: <Wifi className="w-4 h-4" />, label: "Wireless", color: "text-purple-400" },
  web: { icon: <Terminal className="w-4 h-4" />, label: "Web Attacks", color: "text-blue-400" },
  osint: { icon: <Globe className="w-4 h-4" />, label: "OSINT", color: "text-cyan-400" },
};

interface ToolDef {
  id: string;
  name: string;
  description: string;
  installed: boolean;
  params: { name: string; label: string; type: string; required: boolean; default?: string; placeholder?: string; options?: string[] }[];
}

export default function Toolbox() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [selectedTool, setSelectedTool] = useState<ToolDef | null>(null);
  const [toolOutput, setToolOutput] = useState<string | null>(null);
  const [outputMode, setOutputMode] = useState<"real" | "simulated" | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [params, setParams] = useState<Record<string, string>>({});

  const toolsQuery = trpc.toolbox.getTools.useQuery(undefined, { enabled: isAuthenticated });
  const executeTool = trpc.toolbox.executeTool.useMutation({
    onSuccess: (data: any) => {
      setToolOutput(data.output);
      setOutputMode(data.mode || "simulated");
      setExecutionTime(data.executionTime || null);
      setIsRunning(false);
    },
    onError: () => {
      setToolOutput("Error: Tool execution failed.");
      setOutputMode(null);
      setIsRunning(false);
    },
  });

  const handleSelectTool = (tool: ToolDef) => {
    setSelectedTool(tool);
    setToolOutput(null);
    setOutputMode(null);
    setExecutionTime(null);
    // Initialize params from tool's param definitions
    const newParams: Record<string, string> = {};
    (tool.params || []).forEach(p => {
      newParams[p.name] = p.default || "";
    });
    setParams(newParams);
  };

  const handleRunTool = () => {
    if (!selectedTool) return;
    setIsRunning(true);
    setToolOutput(null);
    setOutputMode(null);
    setExecutionTime(null);
    // Filter out empty params
    const filteredParams: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v.trim()) filteredParams[k] = v.trim();
    });
    executeTool.mutate({ toolId: selectedTool.id, params: filteredParams });
  };

  const tools = toolsQuery.data as Record<string, ToolDef[]> | undefined;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mr-3 text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          <span className="font-mono text-sm font-semibold text-foreground">Toolbox</span>
          <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
            {tools ? Object.values(tools).flat().length : 0} Tools
          </Badge>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tools List */}
        <div className="flex-1 overflow-auto p-4">
          {!tools ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {Object.entries(tools).map(([category, categoryTools]) => {
                const meta = CATEGORY_META[category];
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={meta?.color || "text-primary"}>{meta?.icon}</span>
                      <h3 className={`text-sm font-mono font-semibold ${meta?.color || "text-primary"}`}>
                        {meta?.label || category}
                      </h3>
                      <Badge variant="outline" className="text-[9px] font-mono">{categoryTools.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {categoryTools.map((tool) => (
                        <Card
                          key={tool.id}
                          className={`p-3 bg-secondary/20 border-border hover:border-primary/30 transition-colors cursor-pointer ${selectedTool?.id === tool.id ? "border-primary/50 neon-glow-green" : ""}`}
                          onClick={() => handleSelectTool(tool)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-mono font-medium text-foreground truncate">{tool.name}</p>
                                {tool.installed ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                                ) : (
                                  <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-[10px] font-mono text-muted-foreground truncate">{tool.description}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Output & Params Panel */}
        <aside className="w-96 border-l border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                {selectedTool ? selectedTool.name : "Select a Tool"}
              </h3>
              {selectedTool && (
                <Badge
                  variant="outline"
                  className={`text-[9px] font-mono ${selectedTool.installed ? "border-green-500/50 text-green-400" : "border-yellow-500/50 text-yellow-400"}`}
                >
                  {selectedTool.installed ? "INSTALLED" : "NOT INSTALLED"}
                </Badge>
              )}
            </div>
            {selectedTool && !selectedTool.installed && (
              <p className="text-[10px] font-mono text-yellow-400/70 mt-1">
                Tool not found on system. Output will be AI-simulated.
              </p>
            )}
          </div>

          {/* Parameter Inputs */}
          {selectedTool && (
            <div className="p-3 border-b border-border space-y-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Parameters</p>
              {(selectedTool.params || []).map((param) => (
                <div key={param.name}>
                  <label className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    {param.label}
                    {param.required && <span className="text-red-400">*</span>}
                  </label>
                  {param.type === "select" && param.options ? (
                    <select
                      value={params[param.name] || ""}
                      onChange={(e) => setParams(prev => ({ ...prev, [param.name]: e.target.value }))}
                      className="w-full mt-0.5 bg-input border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Select --</option>
                      {param.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={param.type === "number" ? "number" : "text"}
                      value={params[param.name] || ""}
                      onChange={(e) => setParams(prev => ({ ...prev, [param.name]: e.target.value }))}
                      placeholder={param.placeholder || ""}
                      className="w-full mt-0.5 bg-input border border-border rounded px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                </div>
              ))}
              <Button
                size="sm"
                onClick={handleRunTool}
                disabled={isRunning}
                className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-green font-mono text-xs"
              >
                {isRunning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                {selectedTool.installed ? "Execute (Real)" : "Execute (Simulated)"}
              </Button>
            </div>
          )}

          {/* Output */}
          <ScrollArea className="flex-1 p-3">
            {isRunning && (
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-mono">Executing {selectedTool?.name}...</span>
              </div>
            )}
            {toolOutput && (
              <div className="space-y-2">
                {/* Mode Badge */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-mono ${outputMode === "real" ? "border-green-500/50 text-green-400 bg-green-500/10" : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"}`}
                  >
                    {outputMode === "real" ? "REAL OUTPUT" : "SIMULATED OUTPUT"}
                  </Badge>
                  {executionTime !== null && (
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {executionTime}ms
                    </span>
                  )}
                </div>
                {/* Output Content */}
                <div className="font-mono text-xs text-foreground whitespace-pre-wrap bg-secondary/30 rounded-md p-3 border border-border">
                  <SafeStreamdown>{toolOutput}</SafeStreamdown>
                </div>
              </div>
            )}
            {!isRunning && !toolOutput && !selectedTool && (
              <p className="text-xs text-muted-foreground font-mono text-center py-8">
                Select a tool to configure and execute
              </p>
            )}
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
