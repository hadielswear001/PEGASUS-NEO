import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, Save, Settings, RotateCcw, FileText, KeyRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const DEFAULT_PROMPT = `You are Pegasus NEO Supervisor - an advanced AI coordinator managing a team of specialized cybersecurity agents.

Your responsibilities:
1. Analyze the user's security request and determine which agent(s) should handle it
2. Break complex tasks into subtasks and assign them to appropriate agents
3. Coordinate results from multiple agents into coherent reports
4. Provide strategic guidance on penetration testing methodology

Available Agents:
- Recon Agent: Network scanning, port enumeration, service discovery (Tools: nmap, shodan, theHarvester)
- Research Agent: Deep OSINT, intelligence gathering, data correlation (Tools: maltego, spiderfoot, recon-ng)
- Analysis Agent: Vulnerability assessment, code review, risk analysis (Tools: nikto, wapiti, code_scanner)
- Exploitation Agent: Exploit development, payload generation, post-exploitation (Tools: metasploit, sqlmap, hydra)
- Web Agent: Web app testing, XSS/SQLi detection, CMS scanning (Tools: burpsuite, owasp_zap, xsstrike)
- OSINT Agent: Social media tracking, email analysis, digital footprinting (Tools: email_harvester, social_hunter)

Routing Rules:
- For network/infrastructure targets → Recon Agent first, then Analysis
- For web applications → Web Agent first, then Exploitation
- For person/organization research → OSINT Agent first, then Research
- For known vulnerabilities → Exploitation Agent directly
- For comprehensive assessments → Coordinate all agents in sequence

Always respond with:
1. Your analysis of the request
2. Which agent(s) you're delegating to and why
3. Expected deliverables from each agent`;

const PROMPT_TEMPLATES = [
  {
    id: "default",
    name: "Default Supervisor",
    description: "Standard task routing with all agents",
    prompt: DEFAULT_PROMPT,
  },
  {
    id: "stealth",
    name: "Stealth Mode",
    description: "Prioritize passive reconnaissance and minimal footprint",
    prompt: `You are Pegasus NEO Supervisor operating in STEALTH MODE.

Priority: Minimize detection. Use only passive techniques first.

Routing Rules (Stealth Priority):
- Always start with OSINT Agent for passive information gathering
- Use Research Agent for public data correlation before active scanning
- Recon Agent should use passive mode only (no port scanning initially)
- Web Agent limited to passive crawling and public vulnerability databases
- Exploitation Agent ONLY after explicit user confirmation
- Analysis Agent for risk assessment before any active engagement

Response format:
1. Threat model assessment
2. Passive intelligence gathered
3. Risk level of proposed active techniques
4. Agent delegation with stealth considerations`,
  },
  {
    id: "aggressive",
    name: "Full Assault",
    description: "Maximum coverage, all agents in parallel",
    prompt: `You are Pegasus NEO Supervisor in FULL ASSAULT MODE.

Priority: Maximum coverage and speed. Deploy all relevant agents simultaneously.

Routing Rules (Aggressive):
- Deploy Recon + OSINT + Web agents in parallel for initial sweep
- Immediately follow with Analysis on all findings
- Exploitation Agent engages as soon as vulnerabilities are identified
- Research Agent correlates all data in real-time
- No waiting between phases - continuous engagement

Response format:
1. Attack surface summary
2. All agents deployed and their targets
3. Expected timeline for results
4. Escalation paths identified`,
  },
  {
    id: "web_focus",
    name: "Web Application Focus",
    description: "Specialized for web application penetration testing",
    prompt: `You are Pegasus NEO Supervisor specialized in WEB APPLICATION TESTING.

Primary Agents: Web Agent, Exploitation Agent, Analysis Agent

Methodology (OWASP-aligned):
1. Web Agent: Spider/crawl, identify entry points, map attack surface
2. Analysis Agent: Review findings for OWASP Top 10 vulnerabilities
3. Exploitation Agent: Attempt exploitation of confirmed vulnerabilities
4. Research Agent: Check CVE databases for known issues in detected technologies

Focus Areas:
- SQL Injection (SQLi)
- Cross-Site Scripting (XSS)
- Authentication/Session flaws
- Server misconfigurations
- API security issues

Response format:
1. Target web application analysis
2. Technology stack identified
3. Testing methodology selected
4. Agent assignments with specific tools`,
  },
  {
    id: "osint_focus",
    name: "OSINT Investigation",
    description: "Deep open-source intelligence gathering",
    prompt: `You are Pegasus NEO Supervisor specialized in OSINT INVESTIGATIONS.

Primary Agents: OSINT Agent, Research Agent, Recon Agent (passive only)

Investigation Methodology:
1. OSINT Agent: Social media profiling, email discovery, digital footprinting
2. Research Agent: Data correlation, timeline analysis, relationship mapping
3. Recon Agent: DNS records, WHOIS, passive infrastructure mapping

Data Sources Priority:
- Public social media profiles
- Domain/IP registration records
- Public documents and metadata
- Breach databases (ethical use only)
- Professional networks
- Public records and filings

Response format:
1. Subject identification
2. Available data sources
3. Investigation plan
4. Agent assignments with data collection targets
5. Privacy/legal considerations`,
  },
];

export default function SupervisorSettings() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState("default");
  const [apiBaseUrl, setApiBaseUrl] = useState("http://127.0.0.1:1234/v1");
  const [apiKey, setApiKey] = useState("");

  const configQuery = trpc.supervisorConfig.get.useQuery(undefined, { enabled: isAuthenticated });
  const desktopConfigQuery = trpc.desktopConfig.get.useQuery(undefined, { enabled: isAuthenticated });
  const saveConfig = trpc.supervisorConfig.save.useMutation({
    onError: () => {
      toast.error("Failed to save configuration");
      setIsSaving(false);
    },
  });
  const saveDesktopConfig = trpc.desktopConfig.save.useMutation({
    onError: () => {
      toast.error("Failed to save API settings");
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (configQuery.data?.systemPrompt) {
      setPrompt(configQuery.data.systemPrompt);
      // Try to match to a template
      const matched = PROMPT_TEMPLATES.find(t => t.prompt === configQuery.data?.systemPrompt);
      if (matched) setActiveTemplate(matched.id);
      else setActiveTemplate("custom");
    }
  }, [configQuery.data]);

  useEffect(() => {
    if (desktopConfigQuery.data?.apiBaseUrl) {
      setApiBaseUrl(desktopConfigQuery.data.apiBaseUrl);
    }
  }, [desktopConfigQuery.data]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        saveConfig.mutateAsync({ systemPrompt: prompt }),
        saveDesktopConfig.mutateAsync({
          apiBaseUrl,
          apiKey,
        }),
      ]);
      setApiKey("");
      await desktopConfigQuery.refetch();
      toast.success("Settings saved");
    } catch {
      // Individual mutations show their own error toast.
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPrompt(DEFAULT_PROMPT);
    setActiveTemplate("default");
    toast.info("Prompt reset to default");
  };

  const handleSelectTemplate = (template: typeof PROMPT_TEMPLATES[0]) => {
    setPrompt(template.prompt);
    setActiveTemplate(template.id);
    toast.info(`Template "${template.name}" loaded`);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mr-3 text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <span className="font-mono text-sm font-semibold text-foreground">Supervisor Configuration</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground font-mono text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-green font-mono text-xs"
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
            Save
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* API Settings */}
          <Card className="bg-card border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-mono font-semibold text-foreground">LLM API Settings</h3>
              <Badge
                variant="outline"
                className={`text-[9px] font-mono ${desktopConfigQuery.data?.hasApiKey ? "border-green-500/50 text-green-400" : "border-yellow-500/50 text-yellow-400"}`}
              >
                {desktopConfigQuery.data?.hasApiKey ? "API KEY SAVED" : "API KEY REQUIRED"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono mb-3">
              PEGASUS NEO connects to the local OpenAI-compatible LM Studio endpoint.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-3">
              <div>
                <label className="text-[10px] font-mono text-muted-foreground">API Base URL</label>
                <input
                  type="url"
                  value={apiBaseUrl}
                  readOnly
                  placeholder="http://127.0.0.1:1234/v1"
                  className="w-full mt-1 bg-input border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Optional for LM Studio"
                  className="w-full mt-1 bg-input border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </Card>

          {/* Prompt Templates */}
          <Card className="bg-card border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-mono font-semibold text-foreground">Prompt Templates</h3>
              <Badge variant="outline" className="text-[9px] font-mono border-accent/30 text-accent">Quick Start</Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono mb-3">
              Select a pre-built template or customize your own supervisor behavior.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {PROMPT_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`text-left p-3 rounded-md border transition-all ${
                    activeTemplate === template.id
                      ? "border-primary/50 bg-primary/5 neon-glow-green"
                      : "border-border bg-secondary/20 hover:border-primary/30"
                  }`}
                >
                  <p className="text-xs font-mono font-semibold text-foreground">{template.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">{template.description}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* System Prompt Editor */}
          <Card className="bg-card border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-mono font-semibold text-foreground">System Prompt</h3>
              <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
                {activeTemplate === "custom" ? "Custom" : PROMPT_TEMPLATES.find(t => t.id === activeTemplate)?.name || "Custom"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono mb-3">
              This prompt defines how the Supervisor analyzes requests and routes tasks to agents.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setActiveTemplate("custom"); }}
              className="w-full h-[400px] bg-input border border-border rounded-md px-4 py-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Enter supervisor system prompt..."
            />
          </Card>

          {/* Routing Info */}
          <Card className="bg-card border-border p-4">
            <h3 className="text-sm font-mono font-semibold text-foreground mb-3">Agent Routing Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { agent: "Recon", trigger: "Network targets, IP ranges, domains", color: "text-green-400" },
                { agent: "Research", trigger: "Intelligence gathering, correlations", color: "text-cyan-400" },
                { agent: "Analysis", trigger: "Vulnerability assessment, code review", color: "text-yellow-400" },
                { agent: "Exploitation", trigger: "Known CVEs, payload generation", color: "text-red-400" },
                { agent: "Web", trigger: "Web apps, URLs, CMS platforms", color: "text-blue-400" },
                { agent: "OSINT", trigger: "People, organizations, social media", color: "text-purple-400" },
              ].map((item) => (
                <div key={item.agent} className="bg-secondary/20 border border-border rounded-md p-3">
                  <p className={`text-xs font-mono font-semibold ${item.color}`}>{item.agent} Agent</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">{item.trigger}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
