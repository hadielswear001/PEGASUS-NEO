import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Bot, Shield, Search, Globe, Bug, Wifi, Terminal, Settings, Wrench } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { SafeStreamdown } from "@/components/SafeStreamdown";

const AGENT_ICONS: Record<string, React.ReactNode> = {
  recon: <Search className="w-4 h-4" />,
  research: <Globe className="w-4 h-4" />,
  analysis: <Shield className="w-4 h-4" />,
  exploitation: <Bug className="w-4 h-4" />,
  web: <Terminal className="w-4 h-4" />,
  osint: <Search className="w-4 h-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-400 shadow-[0_0_6px_oklch(0.75_0.2_155)]",
  idle: "bg-gray-500",
  busy: "bg-blue-400 shadow-[0_0_6px_oklch(0.65_0.18_220)]",
  error: "bg-red-500",
};

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agentsQuery = trpc.agents.list.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 5000 });
  const messagesQuery = trpc.chat.getMessages.useQuery(
    { agentSlug: "supervisor" },
    { enabled: isAuthenticated }
  );
  const tasksQuery = trpc.tasks.getAll.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 5000 });
  const desktopConfigQuery = trpc.desktopConfig.get.useQuery(undefined, { enabled: isAuthenticated });
  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      messagesQuery.refetch();
      tasksQuery.refetch();
      agentsQuery.refetch();
      setIsSending(false);
    },
    onError: () => setIsSending(false),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data]);

  const handleSend = () => {
    if (!message.trim() || isSending) return;
    setIsSending(true);
    sendMessage.mutate({ agentSlug: "supervisor", content: message });
    setMessage("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-mono text-sm">Initializing Pegasus OS...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="relative">
            <h1 className="text-4xl font-bold text-primary neon-text-green font-mono">PEGASUS NEO</h1>
            <p className="text-muted-foreground mt-2 font-mono text-sm">Local owner session unavailable.</p>
          </div>
          <p className="text-xs text-muted-foreground/70 font-mono">
            Restart PEGASUS NEO to reinitialize the embedded desktop runtime.
          </p>
        </div>
      </div>
    );
  }

  const agents = agentsQuery.data || [];
  const chatMessages = messagesQuery.data || [];
  const allTasks = tasksQuery.data || [];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Bar */}
      <header className="h-12 border-b border-border flex items-center px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-mono font-bold text-primary neon-text-green text-sm">PEGASUS NEO</span>
          <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">v2.0</Badge>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary font-mono text-xs"
            onClick={() => navigate("/toolbox")}
          >
            <Wrench className="w-4 h-4 mr-1" /> Toolbox
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary font-mono text-xs"
            onClick={() => navigate("/settings")}
          >
            <Settings className="w-4 h-4 mr-1" /> Config
          </Button>
          <span className="text-xs text-muted-foreground font-mono">{user?.name || "Operator"}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Agent Sidebar */}
        <aside className="w-56 border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Agent Manager</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {agents.map((agent) => (
                <button
                  key={agent.slug}
                  onClick={() => navigate(`/agent/${agent.slug}`)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary/50 transition-colors text-left group"
                >
                  <div className="text-muted-foreground group-hover:text-primary transition-colors">
                    {AGENT_ICONS[agent.category] || <Bot className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-medium text-foreground truncate">{agent.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{agent.category}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[agent.status]} ${agent.status === "active" || agent.status === "busy" ? "agent-active" : ""}`} />
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Supervisor Chat */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm font-semibold text-foreground">Supervisor</span>
          <Badge variant="outline" className="text-[10px] font-mono border-accent/30 text-accent">AI-Powered</Badge>
          {desktopConfigQuery.data && !desktopConfigQuery.data.hasApiKey && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-7 border-yellow-500/40 text-yellow-400 hover:text-yellow-300 font-mono text-[10px]"
              onClick={() => navigate("/settings")}
            >
              Configure API Key
            </Button>
          )}
        </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <Bot className="w-12 h-12 text-primary/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-mono text-sm">Supervisor ready. Describe your mission.</p>
                  <p className="text-muted-foreground/60 font-mono text-xs mt-2">I will analyze your request and delegate tasks to specialized agents.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-primary/10 border border-primary/20 text-foreground"
                      : "bg-secondary/50 border border-border text-foreground"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="font-mono text-sm">
                        <SafeStreamdown>{msg.content}</SafeStreamdown>
                      </div>
                    ) : (
                      <p className="font-mono text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-secondary/50 border border-border rounded-lg px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="max-w-3xl mx-auto flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Describe your mission to the Supervisor..."
                className="flex-1 bg-input border border-border rounded-md px-4 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isSending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-green"
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* Agent Dock (Bottom) */}
      <footer className="h-24 border-t border-border shrink-0 bg-card/50">
        <div className="h-full px-4 py-2 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Agent Dock — Live Activity</span>
            <span className="text-[10px] font-mono text-muted-foreground">{allTasks.length} tasks</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="flex gap-2 h-full items-stretch">
              {agents.map((agent) => {
                const agentTasks = allTasks.filter(t => t.agentSlug === agent.slug);
                const latestTask = agentTasks[0];
                return (
                  <div
                    key={agent.slug}
                    className="min-w-[160px] bg-secondary/30 border border-border rounded-md px-3 py-1.5 flex flex-col justify-between cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => navigate(`/agent/${agent.slug}`)}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[agent.status]}`} />
                      <span className="text-[10px] font-mono font-medium text-foreground truncate">{agent.name}</span>
                    </div>
                    <p className="text-[9px] font-mono text-muted-foreground truncate mt-0.5">
                      {latestTask ? `${latestTask.status}: ${latestTask.title}` : "Idle — No tasks"}
                    </p>
                  </div>
                );
              })}
              {agents.length === 0 && (
                <div className="flex items-center justify-center w-full">
                  <p className="text-xs text-muted-foreground font-mono">Loading agents...</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </footer>
    </div>
  );
}
