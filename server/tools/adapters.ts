import {
  ToolAdapter,
  ToolResult,
  ToolParam,
  execTool,
  commandExists,
  pythonPackageExists,
} from "./registry";

// ═══════════════════════════════════════════════════════
// HOLEHE - Email OSINT (checks if email is registered on sites)
// ═══════════════════════════════════════════════════════

export const holeheAdapter: ToolAdapter = {
  id: "holehe",
  name: "Holehe",
  description: "Check if an email is registered on various websites",
  category: "osint",
  params: [
    { name: "email", label: "Target Email", type: "string", required: true, placeholder: "target@example.com" },
  ],
  async checkInstalled() {
    return pythonPackageExists("holehe");
  },
  async execute(params) {
    const email = params.email;
    if (!email) return { success: false, output: "[ERROR] Email parameter is required.", executionTime: 0, mode: "real" as const };

    const { stdout, stderr, exitCode } = await execTool({
      command: "holehe",
      args: [email, "--no-color"],
      timeout: 60000,
    });

    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// SHERLOCK - Username OSINT (find accounts by username)
// ═══════════════════════════════════════════════════════

export const sherlockAdapter: ToolAdapter = {
  id: "sherlock",
  name: "Sherlock",
  description: "Find social media accounts by username across platforms",
  category: "osint",
  params: [
    { name: "username", label: "Target Username", type: "string", required: true, placeholder: "johndoe" },
    { name: "timeout", label: "Timeout (seconds)", type: "number", required: false, default: "30", placeholder: "30" },
  ],
  async checkInstalled() {
    return commandExists("sherlock");
  },
  async execute(params) {
    const username = params.username;
    if (!username) return { success: false, output: "[ERROR] Username parameter is required.", executionTime: 0, mode: "real" as const };

    const args = [username, "--print-found"];
    if (params.timeout) args.push("--timeout", params.timeout);

    const { stdout, stderr, exitCode } = await execTool({
      command: "sherlock",
      args,
      timeout: 120000,
    });

    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// NMAP - Network Scanner
// ═══════════════════════════════════════════════════════

export const nmapAdapter: ToolAdapter = {
  id: "nmap",
  name: "Nmap",
  description: "Network scanner & port mapper",
  category: "recon",
  params: [
    { name: "target", label: "Target (IP/hostname)", type: "string", required: true, placeholder: "192.168.1.1 or example.com" },
    { name: "scan_type", label: "Scan Type", type: "select", required: false, default: "-sV", options: ["-sS (SYN Scan)", "-sT (TCP Connect)", "-sV (Version Detection)", "-sU (UDP Scan)", "-A (Aggressive)"] },
    { name: "ports", label: "Ports (e.g. 1-1000)", type: "string", required: false, placeholder: "1-1000 or 80,443,8080" },
  ],
  async checkInstalled() {
    return commandExists("nmap");
  },
  async execute(params) {
    const target = params.target;
    if (!target) return { success: false, output: "[ERROR] Target parameter is required.", executionTime: 0, mode: "real" as const };

    const args: string[] = [];

    // Parse scan type (extract flag from label)
    if (params.scan_type) {
      const flag = params.scan_type.split(" ")[0];
      args.push(flag);
    } else {
      args.push("-sV");
    }

    if (params.ports) {
      args.push("-p", params.ports);
    }

    args.push(target);

    const { stdout, stderr, exitCode } = await execTool({
      command: "nmap",
      args,
      timeout: 180000, // 3 minutes for nmap
    });

    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// SUBFINDER - Subdomain Enumeration
// ═══════════════════════════════════════════════════════

export const subfinderAdapter: ToolAdapter = {
  id: "subfinder",
  name: "Subfinder",
  description: "Fast passive subdomain enumeration tool",
  category: "recon",
  params: [
    { name: "domain", label: "Target Domain", type: "string", required: true, placeholder: "example.com" },
    { name: "recursive", label: "Recursive", type: "boolean", required: false, default: "false" },
  ],
  async checkInstalled() {
    return commandExists("subfinder");
  },
  async execute(params) {
    const domain = params.domain;
    if (!domain) return { success: false, output: "[ERROR] Domain parameter is required.", executionTime: 0, mode: "real" as const };

    const args = ["-d", domain, "-silent"];
    if (params.recursive === "true") args.push("-recursive");

    const { stdout, stderr, exitCode } = await execTool({
      command: "subfinder",
      args,
      timeout: 120000,
    });

    const subdomains = stdout.trim().split("\n").filter(Boolean);
    const output = `[SUBFINDER] Found ${subdomains.length} subdomains for ${domain}\n${"─".repeat(50)}\n${stdout}`;

    return {
      success: exitCode === 0,
      output: output || stderr || "No subdomains found.",
      rawData: { count: subdomains.length, subdomains },
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// WHOIS - Domain Lookup
// ═══════════════════════════════════════════════════════

export const whoisAdapter: ToolAdapter = {
  id: "whois",
  name: "Whois",
  description: "Domain registration and ownership lookup",
  category: "recon",
  params: [
    { name: "target", label: "Domain or IP", type: "string", required: true, placeholder: "example.com or 8.8.8.8" },
  ],
  async checkInstalled() {
    return commandExists("whois");
  },
  async execute(params) {
    const target = params.target;
    if (!target) return { success: false, output: "[ERROR] Target parameter is required.", executionTime: 0, mode: "real" as const };

    const { stdout, stderr, exitCode } = await execTool({
      command: "whois",
      args: [target],
      timeout: 30000,
    });

    return {
      success: exitCode === 0,
      output: stdout || stderr || "No WHOIS data received.",
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// DIG - DNS Lookup
// ═══════════════════════════════════════════════════════

export const digAdapter: ToolAdapter = {
  id: "dig",
  name: "Dig (DNS Lookup)",
  description: "DNS record enumeration and lookup",
  category: "recon",
  params: [
    { name: "domain", label: "Domain", type: "string", required: true, placeholder: "example.com" },
    { name: "record_type", label: "Record Type", type: "select", required: false, default: "ANY", options: ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "ANY"] },
  ],
  async checkInstalled() {
    return commandExists("dig");
  },
  async execute(params) {
    const domain = params.domain;
    if (!domain) return { success: false, output: "[ERROR] Domain parameter is required.", executionTime: 0, mode: "real" as const };

    const recordType = params.record_type || "ANY";
    const { stdout, stderr, exitCode } = await execTool({
      command: "dig",
      args: [domain, recordType, "+noall", "+answer"],
      timeout: 15000,
    });

    const output = `[DIG] DNS Records for ${domain} (Type: ${recordType})\n${"─".repeat(50)}\n${stdout || "No records found."}`;

    return {
      success: exitCode === 0,
      output: output || stderr,
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// NIKTO - Web Server Scanner
// ═══════════════════════════════════════════════════════

export const niktoAdapter: ToolAdapter = {
  id: "nikto",
  name: "Nikto",
  description: "Web server vulnerability scanner",
  category: "web",
  params: [
    { name: "host", label: "Target URL/Host", type: "string", required: true, placeholder: "http://example.com" },
    { name: "port", label: "Port", type: "number", required: false, default: "80", placeholder: "80" },
  ],
  async checkInstalled() {
    return commandExists("nikto");
  },
  async execute(params) {
    const host = params.host;
    if (!host) return { success: false, output: "[ERROR] Host parameter is required.", executionTime: 0, mode: "real" as const };

    const args = ["-h", host, "-nointeractive"];
    if (params.port && params.port !== "80") args.push("-p", params.port);

    const { stdout, stderr, exitCode } = await execTool({
      command: "nikto",
      args,
      timeout: 300000, // 5 min for nikto
    });

    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// WHATWEB - Web Technology Fingerprinting
// ═══════════════════════════════════════════════════════

export const whatwebAdapter: ToolAdapter = {
  id: "whatweb",
  name: "WhatWeb",
  description: "Web technology fingerprinting and identification",
  category: "web",
  params: [
    { name: "target", label: "Target URL", type: "string", required: true, placeholder: "https://example.com" },
    { name: "aggression", label: "Aggression Level", type: "select", required: false, default: "1", options: ["1 (Stealthy)", "3 (Aggressive)", "4 (Heavy)"] },
  ],
  async checkInstalled() {
    return commandExists("whatweb");
  },
  async execute(params) {
    const target = params.target;
    if (!target) return { success: false, output: "[ERROR] Target URL is required.", executionTime: 0, mode: "real" as const };

    const aggression = params.aggression ? params.aggression.split(" ")[0] : "1";
    const { stdout, stderr, exitCode } = await execTool({
      command: "whatweb",
      args: [target, `-a${aggression}`, "--color=never"],
      timeout: 60000,
    });

    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// THEHARVESTER - Email & Subdomain Harvester
// ═══════════════════════════════════════════════════════

export const theHarvesterAdapter: ToolAdapter = {
  id: "theHarvester",
  name: "theHarvester",
  description: "Email and subdomain harvester from public sources",
  category: "recon",
  params: [
    { name: "domain", label: "Target Domain", type: "string", required: true, placeholder: "example.com" },
    { name: "source", label: "Data Source", type: "select", required: false, default: "all", options: ["all", "google", "bing", "linkedin", "twitter", "shodan", "dnsdumpster", "crtsh"] },
    { name: "limit", label: "Result Limit", type: "number", required: false, default: "100", placeholder: "100" },
  ],
  async checkInstalled() {
    return commandExists("theHarvester") || pythonPackageExists("theHarvester");
  },
  async execute(params) {
    const domain = params.domain;
    if (!domain) return { success: false, output: "[ERROR] Domain parameter is required.", executionTime: 0, mode: "real" as const };

    const source = params.source || "all";
    const limit = params.limit || "100";

    const { stdout, stderr, exitCode } = await execTool({
      command: "theHarvester",
      args: ["-d", domain, "-b", source, "-l", limit],
      timeout: 120000,
    });

    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// SQLMAP - SQL Injection Scanner
// ═══════════════════════════════════════════════════════

export const sqlmapAdapter: ToolAdapter = {
  id: "sqlmap",
  name: "SQLmap",
  description: "Automatic SQL injection detection and exploitation",
  category: "exploitation",
  params: [
    { name: "url", label: "Target URL (with parameter)", type: "string", required: true, placeholder: "http://example.com/page?id=1" },
    { name: "level", label: "Test Level (1-5)", type: "select", required: false, default: "1", options: ["1", "2", "3", "4", "5"] },
    { name: "risk", label: "Risk Level (1-3)", type: "select", required: false, default: "1", options: ["1", "2", "3"] },
  ],
  async checkInstalled() {
    return commandExists("sqlmap");
  },
  async execute(params) {
    const url = params.url;
    if (!url) return { success: false, output: "[ERROR] URL parameter is required.", executionTime: 0, mode: "real" as const };

    const args = ["-u", url, "--batch", "--random-agent"];
    if (params.level) args.push("--level", params.level);
    if (params.risk) args.push("--risk", params.risk);

    const { stdout, stderr, exitCode } = await execTool({
      command: "sqlmap",
      args,
      timeout: 180000,
    });

    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// HYDRA - Network Login Cracker
// ═══════════════════════════════════════════════════════

export const hydraAdapter: ToolAdapter = {
  id: "hydra",
  name: "Hydra",
  description: "Fast network login cracker (brute force)",
  category: "exploitation",
  params: [
    { name: "target", label: "Target Host", type: "string", required: true, placeholder: "192.168.1.1" },
    { name: "service", label: "Service", type: "select", required: true, options: ["ssh", "ftp", "http-get", "http-post-form", "smtp", "mysql", "rdp", "vnc", "telnet"] },
    { name: "username", label: "Username (or file path)", type: "string", required: true, placeholder: "admin or /path/to/users.txt" },
    { name: "password_file", label: "Password File Path", type: "string", required: true, placeholder: "/path/to/wordlist.txt" },
  ],
  async checkInstalled() {
    return commandExists("hydra");
  },
  async execute(params) {
    const { target, service, username, password_file } = params;
    if (!target || !service || !username || !password_file) {
      return { success: false, output: "[ERROR] All parameters (target, service, username, password_file) are required.", executionTime: 0, mode: "real" as const };
    }

    const args: string[] = [];
    // Check if username is a file
    if (username.startsWith("/")) {
      args.push("-L", username);
    } else {
      args.push("-l", username);
    }
    args.push("-P", password_file, target, service);

    const { stdout, stderr, exitCode } = await execTool({
      command: "hydra",
      args,
      timeout: 300000,
    });

    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// GOBUSTER - Directory/File Brute Forcer
// ═══════════════════════════════════════════════════════

export const gobusterAdapter: ToolAdapter = {
  id: "gobuster",
  name: "Gobuster",
  description: "Directory/file brute forcing tool",
  category: "web",
  params: [
    { name: "url", label: "Target URL", type: "string", required: true, placeholder: "http://example.com" },
    { name: "wordlist", label: "Wordlist Path", type: "string", required: true, placeholder: "/usr/share/wordlists/dirb/common.txt" },
    { name: "mode", label: "Mode", type: "select", required: false, default: "dir", options: ["dir", "dns", "vhost", "fuzz"] },
  ],
  async checkInstalled() {
    return commandExists("gobuster");
  },
  async execute(params) {
    const { url, wordlist, mode } = params;
    if (!url || !wordlist) {
      return { success: false, output: "[ERROR] URL and wordlist are required.", executionTime: 0, mode: "real" as const };
    }

    const scanMode = mode || "dir";
    const { stdout, stderr, exitCode } = await execTool({
      command: "gobuster",
      args: [scanMode, "-u", url, "-w", wordlist, "--no-color"],
      timeout: 300000,
    });

    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// NUCLEI - Vulnerability Scanner
// ═══════════════════════════════════════════════════════

export const nucleiAdapter: ToolAdapter = {
  id: "nuclei",
  name: "Nuclei",
  description: "Fast vulnerability scanner based on templates",
  category: "web",
  params: [
    { name: "target", label: "Target URL", type: "string", required: true, placeholder: "https://example.com" },
    { name: "severity", label: "Severity Filter", type: "select", required: false, options: ["info", "low", "medium", "high", "critical"] },
  ],
  async checkInstalled() {
    return commandExists("nuclei");
  },
  async execute(params) {
    const target = params.target;
    if (!target) return { success: false, output: "[ERROR] Target parameter is required.", executionTime: 0, mode: "real" as const };

    const args = ["-u", target, "-nc"]; // -nc = no color
    if (params.severity) args.push("-severity", params.severity);

    const { stdout, stderr, exitCode } = await execTool({
      command: "nuclei",
      args,
      timeout: 300000,
    });

    return {
      success: exitCode === 0,
      output: stdout || stderr || "No vulnerabilities found.",
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// HTTPX - HTTP Probing
// ═══════════════════════════════════════════════════════

export const httpxAdapter: ToolAdapter = {
  id: "httpx",
  name: "HTTPX",
  description: "Fast HTTP probing and technology detection",
  category: "recon",
  params: [
    { name: "target", label: "Target (URL or domain)", type: "string", required: true, placeholder: "example.com" },
    { name: "tech_detect", label: "Detect Technologies", type: "boolean", required: false, default: "true" },
  ],
  async checkInstalled() {
    return commandExists("httpx");
  },
  async execute(params) {
    const target = params.target;
    if (!target) return { success: false, output: "[ERROR] Target parameter is required.", executionTime: 0, mode: "real" as const };

    const args = ["-u", target, "-nc", "-title", "-status-code", "-content-length"];
    if (params.tech_detect === "true") args.push("-tech-detect");

    const { stdout, stderr, exitCode } = await execTool({
      command: "httpx",
      args,
      timeout: 60000,
    });

    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real" as const,
      executionTime: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════
// CURL-BASED SHODAN (via API)
// ═══════════════════════════════════════════════════════

export const shodanAdapter: ToolAdapter = {
  id: "shodan",
  name: "Shodan",
  description: "Internet-connected device search engine (requires API key)",
  category: "recon",
  params: [
    { name: "target", label: "Target IP", type: "string", required: true, placeholder: "8.8.8.8" },
    { name: "api_key", label: "Shodan API Key", type: "string", required: true, placeholder: "YOUR_SHODAN_API_KEY" },
  ],
  async checkInstalled() {
    return commandExists("curl"); // Uses curl to hit Shodan API
  },
  async execute(params) {
    const { target, api_key } = params;
    if (!target || !api_key) return { success: false, output: "[ERROR] Target IP and API key are required.", executionTime: 0, mode: "real" as const };

    const { stdout, stderr, exitCode } = await execTool({
      command: "curl",
      args: ["-s", `https://api.shodan.io/shodan/host/${target}?key=${api_key}`],
      timeout: 30000,
    });

    try {
      const data = JSON.parse(stdout);
      const formatted = [
        `[SHODAN] Results for ${target}`,
        "─".repeat(50),
        `IP: ${data.ip_str || target}`,
        `Organization: ${data.org || "N/A"}`,
        `OS: ${data.os || "N/A"}`,
        `Ports: ${(data.ports || []).join(", ")}`,
        `Hostnames: ${(data.hostnames || []).join(", ")}`,
        `Country: ${data.country_name || "N/A"}`,
        `City: ${data.city || "N/A"}`,
        "",
        "─── Services ───",
        ...(data.data || []).map((svc: any) => `  Port ${svc.port}/${svc.transport}: ${svc.product || ""} ${svc.version || ""}`),
      ].join("\n");

      return { success: true, output: formatted, rawData: data, mode: "real" as const, executionTime: 0 };
    } catch {
      return { success: exitCode === 0, output: stdout || stderr, mode: "real" as const, executionTime: 0 };
    }
  },
};

// ═══════════════════════════════════════════════════════
// EXPORT ALL ADAPTERS
// ═══════════════════════════════════════════════════════

export const allAdapters: ToolAdapter[] = [
  holeheAdapter,
  sherlockAdapter,
  nmapAdapter,
  subfinderAdapter,
  whoisAdapter,
  digAdapter,
  niktoAdapter,
  whatwebAdapter,
  theHarvesterAdapter,
  sqlmapAdapter,
  hydraAdapter,
  gobusterAdapter,
  nucleiAdapter,
  httpxAdapter,
  shodanAdapter,
];
