import { spawn } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

// ═══════════════════════════════════════════════════════
// TOOL ADAPTER INTERFACE
// ═══════════════════════════════════════════════════════

export interface ToolResult {
  success: boolean;
  output: string;
  rawData?: Record<string, unknown>;
  executionTime: number; // ms
  mode: "real" | "simulated";
}

export interface ToolParam {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "select";
  required: boolean;
  default?: string;
  placeholder?: string;
  options?: string[]; // for select type
}

export interface ToolAdapter {
  id: string;
  name: string;
  description: string;
  category: "recon" | "exploitation" | "wireless" | "web" | "osint";
  params: ToolParam[];
  /** Check if the tool binary/package is installed on the system */
  checkInstalled(): Promise<boolean>;
  /** Execute the tool with given parameters - REAL execution */
  execute(params: Record<string, string>): Promise<ToolResult>;
}

// ═══════════════════════════════════════════════════════
// SUBPROCESS EXECUTION HELPER
// ═══════════════════════════════════════════════════════

export interface ExecOptions {
  command: string;
  args: string[];
  timeout?: number; // ms, default 120000 (2 min)
  cwd?: string;
  env?: Record<string, string>;
}

export function execTool(options: ExecOptions): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { command, args, timeout = 120000, cwd, env } = options;

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let killed = false;

    const proc = spawn(command, args, {
      cwd: cwd || process.cwd(),
      env: { ...process.env, ...env },
      shell: true,
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      setTimeout(() => proc.kill("SIGKILL"), 5000);
    }, timeout);

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (killed) {
        resolve({ stdout, stderr: stderr + "\n[TIMEOUT] Tool execution exceeded time limit.", exitCode: code ?? 1 });
      } else {
        resolve({ stdout, stderr, exitCode: code ?? 0 });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** Check if a command exists on the system */
export async function commandExists(cmd: string): Promise<boolean> {
  try {
    const result = await execTool({ command: "which", args: [cmd], timeout: 5000 });
    return result.exitCode === 0 && result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/** Check if a Python package is installed */
export async function pythonPackageExists(pkg: string): Promise<boolean> {
  try {
    const result = await execTool({
      command: "python3",
      args: ["-c", `import ${pkg}; print('OK')`],
      timeout: 10000,
    });
    return result.exitCode === 0 && result.stdout.includes("OK");
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// TOOL REGISTRY
// ═══════════════════════════════════════════════════════

class ToolRegistry {
  private adapters: Map<string, ToolAdapter> = new Map();
  private installCache: Map<string, { installed: boolean; checkedAt: number }> = new Map();
  private CACHE_TTL = 60000; // 1 minute

  register(adapter: ToolAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): ToolAdapter | undefined {
    return this.adapters.get(id);
  }

  getAll(): ToolAdapter[] {
    return Array.from(this.adapters.values());
  }

  getByCategory(category: string): ToolAdapter[] {
    return this.getAll().filter((a) => a.category === category);
  }

  async checkInstalled(id: string): Promise<boolean> {
    const cached = this.installCache.get(id);
    if (cached && Date.now() - cached.checkedAt < this.CACHE_TTL) {
      return cached.installed;
    }

    const adapter = this.adapters.get(id);
    if (!adapter) return false;

    const installed = await adapter.checkInstalled();
    this.installCache.set(id, { installed, checkedAt: Date.now() });
    return installed;
  }

  async getToolsWithStatus(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    installed: boolean;
    params: ToolParam[];
  }>> {
    const tools = this.getAll();
    const results = await Promise.all(
      tools.map(async (tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        installed: await this.checkInstalled(tool.id),
        params: tool.params,
      }))
    );
    return results;
  }

  async execute(id: string, params: Record<string, string>): Promise<ToolResult> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      return {
        success: false,
        output: `[ERROR] Tool "${id}" not found in registry.`,
        executionTime: 0,
        mode: "simulated",
      };
    }

    const installed = await this.checkInstalled(id);
    if (!installed) {
      return {
        success: false,
        output: `[NOT INSTALLED] Tool "${adapter.name}" is not installed on this system.\n\nTo install, run the appropriate command:\n${getInstallHint(id)}`,
        executionTime: 0,
        mode: "simulated",
      };
    }

    const start = Date.now();
    try {
      const result = await adapter.execute(params);
      result.executionTime = Date.now() - start;
      return result;
    } catch (err: any) {
      return {
        success: false,
        output: `[EXECUTION ERROR] ${err.message || "Unknown error during tool execution."}`,
        executionTime: Date.now() - start,
        mode: "real",
      };
    }
  }
}

// ═══════════════════════════════════════════════════════
// INSTALL HINTS
// ═══════════════════════════════════════════════════════

function getInstallHint(toolId: string): string {
  const hints: Record<string, string> = {
    holehe: "pip3 install holehe",
    sherlock: "pip3 install sherlock-project",
    nmap: "brew install nmap  (macOS) | apt install nmap (Linux)",
    subfinder: "go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest",
    whois: "brew install whois (macOS) | apt install whois (Linux)",
    dig: "Built-in on most systems. Install: brew install bind (macOS) | apt install dnsutils (Linux)",
    nikto: "brew install nikto (macOS) | apt install nikto (Linux)",
    whatweb: "brew install whatweb (macOS) | gem install whatweb",
    theHarvester: "pip3 install theHarvester",
    amass: "brew install amass (macOS) | go install github.com/owasp-amass/amass/v4/...@master",
    nuclei: "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest",
    httpx: "go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest",
    sqlmap: "pip3 install sqlmap",
    hydra: "brew install hydra (macOS) | apt install hydra (Linux)",
    gobuster: "go install github.com/OJ/gobuster/v3@latest",
    ffuf: "go install github.com/ffuf/ffuf/v2@latest",
    wpscan: "gem install wpscan",
    xsstrike: "pip3 install xsstrike",
  };
  return hints[toolId] || `Search: "install ${toolId}" for your OS.`;
}

// ═══════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════

export const toolRegistry = new ToolRegistry();
