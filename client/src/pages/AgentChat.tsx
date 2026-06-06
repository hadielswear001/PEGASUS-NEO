import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Bot, ArrowLeft, Shield, Search, Globe, Bug, Terminal } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { SafeStreamdown } from "@/components/SafeStreamdown";

const AGENT_ICONS: Record<string, React.ReactNode> = {
  recon: <Search className="w-5 h-5" />,
  research: <Globe className="w-5 h-5" />,
  analysis: <Shield className="w-5 h-5" />,
  exploitation: <Bug className="w-5 h-5" />,
  web: <Terminal className="w-5 h-5" />,
  osint: <Search className="w-5 h-5" />,
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-400",
  idle: "bg-gray-500",
  busy: "bg-blue-400",
  error: "bg-red-500",
};

export default function AgentChat() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agentQuery = trpc.agents.get.useQuery(
    { slug: slug || "" },
    { enabled: isAuthenticated && !!slug, refetchInterval: 5000 }
  );
  const messagesQuery = trpc.chat.getMessages.useQuery(
    { agentSlug: slug || "" },
    { enabled: isAuthenticated && !!slug }
  );
  const tasksQuery = trpc.tasks.getByAgent.useQuery(
    { agentSlug: slug || "" },
    { enabled: isAuthenticated && !!slug, refetchInterval: 5000 }
  );
  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      messagesQuery.refetch();
      tasksQuery.refetch();
      agentQuery.refetch();
      setIsSending(false);
    },
    onError: () => setIsSending(false),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data]);

  const handleSend = () => {
    if (!message.trim() || isSending || !slug) return;
    setIsSending(true);
    sendMessage.mutate({ agentSlug: slug, content: message });
    setMessage("");
  };

  const agent = agentQuery.data;
  const chatMessages = messagesQuery.data || [];
  const agentTasks = tasksQuery.data || [];

  if (!agent && !agentQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-mono">Agent not found</p>
          <Button variant="ghost" className="mt-4 font-mono" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Supervisor
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mr-3 text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="text-primary">
            {agent ? (AGENT_ICONS[agent.category] || <Bot className="w-5 h-5" />) : <Loader2 className="w-5 h-5 animate-spin" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-foreground">{agent?.name || "Loading..."}</span>
              {agent && (
                <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[agent.status]} ${agent.status === "active" || agent.status === "busy" ? "agent-active" : ""}`} />
              )}
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">{agent?.description?.substring(0, 60)}...</p>
          </div>
        </div>
        <div className="ml-auto">
          <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
            {agent?.category?.toUpperCase()}
          </Badge>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-primary/30 mx-auto mb-4 flex justify-center">
                    {agent ? (AGENT_ICONS[agent.category] || <Bot className="w-12 h-12" />) : <Bot className="w-12 h-12" />}
                  </div>
                  <p className="text-muted-foreground font-mono text-sm">{agent?.name} ready for tasking.</p>
                  <p className="text-muted-foreground/60 font-mono text-xs mt-2">Tools: {(agent?.tools as string[] || []).join(", ")}</p>
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
                placeholder={`Message ${agent?.name || "Agent"}...`}
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

        {/* Task Panel (Right side) */}
        <aside className="w-64 border-l border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Task Queue</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {agentTasks.length === 0 && (
                <p className="text-xs text-muted-foreground font-mono text-center py-4">No tasks assigned</p>
              )}
              {agentTasks.map((task) => (
                <div key={task.id} className="bg-secondary/30 border border-border rounded-md p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono ${
                        task.status === "completed" ? "border-green-500/30 text-green-400" :
                        task.status === "running" ? "border-blue-400/30 text-blue-400" :
                        task.status === "failed" ? "border-red-500/30 text-red-400" :
                        "border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {task.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] font-mono text-foreground truncate">{task.title}</p>
                  {task.result && (
                    <p className="text-[9px] font-mono text-muted-foreground mt-1 line-clamp-2">{task.result}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
