// server/embedded.ts
import "dotenv/config";
import express from "express";
import fs3 from "fs";
import { createServer } from "http";
import net from "net";
import path3 from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  validatePayload(payload);
  return false;
}

// shared/const.ts
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";

// server/db.ts
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";

// server/_core/env.ts
var ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production"
};

// server/db.ts
var _db = null;
var appSupportDir = () => process.env.PEGASUS_APP_SUPPORT_DIR || path.join(os.homedir(), "Library", "Application Support", "PegasusNEO");
var getDatabasePath = () => process.env.PEGASUS_DB_PATH || path.join(appSupportDir(), "pegasus.db");
var toDate = (value) => {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value * 1e3);
  if (typeof value === "string") return new Date(value);
  return /* @__PURE__ */ new Date();
};
var toUnix = (value) => {
  const date = toDate(value);
  return Math.floor(date.getTime() / 1e3);
};
var parseJson = (value, fallback) => {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
var mapUser = (row) => ({
  ...row,
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
  lastSignedIn: toDate(row.lastSignedIn)
});
var mapAgent = (row) => ({
  ...row,
  tools: parseJson(row.tools, []),
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt)
});
var mapMessage = (row) => ({
  ...row,
  metadata: parseJson(row.metadata, null),
  createdAt: toDate(row.createdAt)
});
var mapTask = (row) => ({
  ...row,
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt)
});
var mapSupervisorConfig = (row) => ({
  ...row,
  routingRules: parseJson(row.routingRules, null),
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt)
});
var DEFAULT_AGENTS = [
  {
    name: "Recon Agent",
    slug: "recon",
    description: "Network scanning, port enumeration, service discovery",
    category: "recon",
    systemPrompt: "You are the Recon Agent. You specialize in network reconnaissance, port scanning, service enumeration, and infrastructure mapping. Always provide open ports, running services, OS hints, and potential entry points.",
    tools: ["nmap", "subfinder", "whois", "dig", "amass"]
  },
  {
    name: "Research Agent",
    slug: "research",
    description: "Deep OSINT, intelligence gathering, data correlation",
    category: "research",
    systemPrompt: "You are the Research Agent. You specialize in intelligence gathering, data correlation, and threat research from public sources.",
    tools: ["theHarvester", "sherlock", "holehe", "whois", "subfinder"]
  },
  {
    name: "Analysis Agent",
    slug: "analysis",
    description: "Vulnerability assessment, code review, risk analysis",
    category: "analysis",
    systemPrompt: "You are the Analysis Agent. You assess scan results, identify likely vulnerabilities, rank severity, and recommend remediation.",
    tools: ["nuclei", "nikto", "whatweb", "httpx"]
  },
  {
    name: "Exploitation Agent",
    slug: "exploitation",
    description: "Exploit development, payload generation, post-exploitation",
    category: "exploitation",
    systemPrompt: "You are the Exploitation Agent. You plan validation steps for confirmed vulnerabilities while respecting legal scope and user authorization.",
    tools: ["sqlmap", "hydra"]
  },
  {
    name: "Web Agent",
    slug: "web",
    description: "Web application testing, XSS/SQLi detection, CMS scanning",
    category: "web",
    systemPrompt: "You are the Web Agent. You specialize in OWASP-aligned web application testing, technology fingerprinting, and web attack surface mapping.",
    tools: ["nikto", "whatweb", "gobuster", "ffuf", "wpscan", "xsstrike"]
  },
  {
    name: "OSINT Agent",
    slug: "osint",
    description: "Social media tracking, email analysis, digital footprinting",
    category: "osint",
    systemPrompt: "You are the OSINT Agent. You gather public intelligence ethically, focusing on email, username, domain, and infrastructure footprinting.",
    tools: ["holehe", "sherlock", "theHarvester", "whois"]
  }
];
function ensureSchema(db) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openId TEXT NOT NULL UNIQUE,
      name TEXT,
      email TEXT,
      loginMethod TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
      updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
      lastSignedIn INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      systemPrompt TEXT,
      tools TEXT,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
      updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agentSlug TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      userId INTEGER NOT NULL,
      metadata TEXT,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agentSlug TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      result TEXT,
      userId INTEGER NOT NULL,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
      updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS supervisor_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL UNIQUE,
      systemPrompt TEXT NOT NULL,
      routingRules TEXT,
      createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
      updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
}
function seedAgents(db) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM agents").get();
  if (count.count > 0) return;
  const insert = db.prepare(`
    INSERT INTO agents (slug, name, description, category, status, systemPrompt, tools)
    VALUES (@slug, @name, @description, @category, 'idle', @systemPrompt, @tools)
  `);
  const seed = db.transaction(() => {
    for (const agent of DEFAULT_AGENTS) {
      insert.run({ ...agent, tools: JSON.stringify(agent.tools) });
    }
  });
  seed();
}
async function getDb() {
  if (_db) return _db;
  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  _db = new Database(dbPath);
  ensureSchema(_db);
  seedAgents(_db);
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  const now = Math.floor(Date.now() / 1e3);
  const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  const lastSignedIn = user.lastSignedIn ? toUnix(user.lastSignedIn) : now;
  db.prepare(`
    INSERT INTO users (openId, name, email, loginMethod, role, lastSignedIn)
    VALUES (@openId, @name, @email, @loginMethod, @role, @lastSignedIn)
    ON CONFLICT(openId) DO UPDATE SET
      name = COALESCE(excluded.name, users.name),
      email = COALESCE(excluded.email, users.email),
      loginMethod = COALESCE(excluded.loginMethod, users.loginMethod),
      role = excluded.role,
      lastSignedIn = excluded.lastSignedIn,
      updatedAt = unixepoch()
  `).run({
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role,
    lastSignedIn
  });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  const row = db.prepare("SELECT * FROM users WHERE openId = ? LIMIT 1").get(openId);
  return row ? mapUser(row) : void 0;
}
async function getDesktopOwnerUser() {
  const openId = ENV.ownerOpenId || "owner";
  await upsertUser({
    openId,
    name: process.env.OWNER_NAME || "Admin",
    email: null,
    loginMethod: "desktop",
    role: "admin",
    lastSignedIn: /* @__PURE__ */ new Date()
  });
  return getUserByOpenId(openId);
}
async function getAllAgents() {
  const db = await getDb();
  return db.prepare("SELECT * FROM agents ORDER BY id ASC").all().map(mapAgent);
}
async function getAgentBySlug(slug) {
  const db = await getDb();
  const row = db.prepare("SELECT * FROM agents WHERE slug = ? LIMIT 1").get(slug);
  return row ? mapAgent(row) : void 0;
}
async function updateAgentStatus(slug, status) {
  const db = await getDb();
  db.prepare("UPDATE agents SET status = ?, updatedAt = unixepoch() WHERE slug = ?").run(status, slug);
}
async function getMessages(agentSlug, userId, limit = 50) {
  const db = await getDb();
  return db.prepare("SELECT * FROM messages WHERE agentSlug = ? AND userId = ? ORDER BY createdAt DESC LIMIT ?").all(agentSlug, userId, limit).map(mapMessage);
}
async function createMessage(msg) {
  const db = await getDb();
  const result = db.prepare(`
    INSERT INTO messages (agentSlug, role, content, userId, metadata)
    VALUES (@agentSlug, @role, @content, @userId, @metadata)
  `).run({
    agentSlug: msg.agentSlug,
    role: msg.role,
    content: msg.content,
    userId: msg.userId,
    metadata: msg.metadata ? JSON.stringify(msg.metadata) : null
  });
  return result;
}
async function getTasksByAgent(agentSlug, userId) {
  const db = await getDb();
  return db.prepare("SELECT * FROM tasks WHERE agentSlug = ? AND userId = ? ORDER BY createdAt DESC LIMIT 20").all(agentSlug, userId).map(mapTask);
}
async function getAllActiveTasks(userId) {
  const db = await getDb();
  return db.prepare("SELECT * FROM tasks WHERE userId = ? ORDER BY createdAt DESC LIMIT 50").all(userId).map(mapTask);
}
async function createTask(task) {
  const db = await getDb();
  return db.prepare(`
    INSERT INTO tasks (agentSlug, title, description, status, result, userId)
    VALUES (@agentSlug, @title, @description, @status, @result, @userId)
  `).run({
    agentSlug: task.agentSlug,
    title: task.title,
    description: task.description ?? null,
    status: task.status ?? "pending",
    result: task.result ?? null,
    userId: task.userId
  });
}
async function updateTaskStatus(taskId, status, result) {
  const db = await getDb();
  db.prepare(`
    UPDATE tasks
    SET status = @status,
        result = COALESCE(@result, result),
        updatedAt = unixepoch()
    WHERE id = @taskId
  `).run({ taskId, status, result: result ?? null });
}
async function getSupervisorConfig(userId) {
  const db = await getDb();
  const row = db.prepare("SELECT * FROM supervisor_config WHERE userId = ? LIMIT 1").get(userId);
  return row ? mapSupervisorConfig(row) : void 0;
}
async function upsertSupervisorConfig(config) {
  const db = await getDb();
  db.prepare(`
    INSERT INTO supervisor_config (userId, systemPrompt, routingRules)
    VALUES (@userId, @systemPrompt, @routingRules)
    ON CONFLICT(userId) DO UPDATE SET
      systemPrompt = excluded.systemPrompt,
      routingRules = excluded.routingRules,
      updatedAt = unixepoch()
  `).run({
    userId: config.userId,
    systemPrompt: config.systemPrompt,
    routingRules: config.routingRules ? JSON.stringify(config.routingRules) : null
  });
}

// server/desktopConfig.ts
import fs2 from "fs";
import os2 from "os";
import path2 from "path";
var LM_STUDIO_API_BASE = "http://127.0.0.1:1234/v1";
var DEFAULT_CONFIG = {
  apiBaseUrl: LM_STUDIO_API_BASE,
  apiKey: "lm-studio"
};
var appSupportDir2 = () => process.env.PEGASUS_APP_SUPPORT_DIR || path2.join(os2.homedir(), "Library", "Application Support", "PegasusNEO");
var getDesktopConfigPath = () => process.env.PEGASUS_CONFIG_PATH || path2.join(appSupportDir2(), "config.json");
function readDesktopConfig() {
  const configPath = getDesktopConfigPath();
  if (!fs2.existsSync(configPath)) return { ...DEFAULT_CONFIG };
  try {
    const parsed = JSON.parse(fs2.readFileSync(configPath, "utf-8"));
    return {
      apiBaseUrl: LM_STUDIO_API_BASE,
      apiKey: parsed.apiKey?.trim() || DEFAULT_CONFIG.apiKey
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
function writeDesktopConfig(config) {
  const normalized = {
    apiBaseUrl: LM_STUDIO_API_BASE,
    apiKey: config.apiKey?.trim() || DEFAULT_CONFIG.apiKey
  };
  const configPath = getDesktopConfigPath();
  fs2.mkdirSync(path2.dirname(configPath), { recursive: true });
  fs2.writeFileSync(configPath, `${JSON.stringify(normalized, null, 2)}
`, "utf-8");
  return normalized;
}

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveRuntimeConfig = () => {
  const desktopConfig = readDesktopConfig();
  return {
    apiBaseUrl: desktopConfig.apiBaseUrl,
    apiKey: desktopConfig.apiKey
  };
};
var resolveApiUrl = () => {
  const { apiBaseUrl } = resolveRuntimeConfig();
  const trimmed = apiBaseUrl.trim().replace(/\/$/, "");
  return trimmed.endsWith("/v1") ? `${trimmed}/chat/completions` : `${trimmed}/v1/chat/completions`;
};
var assertApiKey = () => {
  if (!resolveRuntimeConfig().apiKey) {
    throw new Error("LLM API key is not configured. Open Settings and save an API key.");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const { apiKey } = resolveRuntimeConfig();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/tools/registry.ts
import { spawn } from "child_process";
function execTool(options) {
  const { command, args, timeout = 12e4, cwd, env } = options;
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let killed = false;
    const proc = spawn(command, args, {
      cwd: cwd || process.cwd(),
      env: { ...process.env, ...env },
      shell: true
    });
    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      setTimeout(() => proc.kill("SIGKILL"), 5e3);
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
async function commandExists(cmd) {
  try {
    const result = await execTool({ command: "which", args: [cmd], timeout: 5e3 });
    return result.exitCode === 0 && result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}
async function pythonPackageExists(pkg) {
  try {
    const result = await execTool({
      command: "python3",
      args: ["-c", `import ${pkg}; print('OK')`],
      timeout: 1e4
    });
    return result.exitCode === 0 && result.stdout.includes("OK");
  } catch {
    return false;
  }
}
var ToolRegistry = class {
  adapters = /* @__PURE__ */ new Map();
  installCache = /* @__PURE__ */ new Map();
  CACHE_TTL = 6e4;
  // 1 minute
  register(adapter) {
    this.adapters.set(adapter.id, adapter);
  }
  get(id) {
    return this.adapters.get(id);
  }
  getAll() {
    return Array.from(this.adapters.values());
  }
  getByCategory(category) {
    return this.getAll().filter((a) => a.category === category);
  }
  async checkInstalled(id) {
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
  async getToolsWithStatus() {
    const tools = this.getAll();
    const results = await Promise.all(
      tools.map(async (tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        installed: await this.checkInstalled(tool.id),
        params: tool.params
      }))
    );
    return results;
  }
  async execute(id, params) {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      return {
        success: false,
        output: `[ERROR] Tool "${id}" not found in registry.`,
        executionTime: 0,
        mode: "simulated"
      };
    }
    const installed = await this.checkInstalled(id);
    if (!installed) {
      return {
        success: false,
        output: `[NOT INSTALLED] Tool "${adapter.name}" is not installed on this system.

To install, run the appropriate command:
${getInstallHint(id)}`,
        executionTime: 0,
        mode: "simulated"
      };
    }
    const start = Date.now();
    try {
      const result = await adapter.execute(params);
      result.executionTime = Date.now() - start;
      return result;
    } catch (err) {
      return {
        success: false,
        output: `[EXECUTION ERROR] ${err.message || "Unknown error during tool execution."}`,
        executionTime: Date.now() - start,
        mode: "real"
      };
    }
  }
};
function getInstallHint(toolId) {
  const hints = {
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
    xsstrike: "pip3 install xsstrike"
  };
  return hints[toolId] || `Search: "install ${toolId}" for your OS.`;
}
var toolRegistry = new ToolRegistry();

// server/tools/adapters.ts
var holeheAdapter = {
  id: "holehe",
  name: "Holehe",
  description: "Check if an email is registered on various websites",
  category: "osint",
  params: [
    { name: "email", label: "Target Email", type: "string", required: true, placeholder: "target@example.com" }
  ],
  async checkInstalled() {
    return pythonPackageExists("holehe");
  },
  async execute(params) {
    const email = params.email;
    if (!email) return { success: false, output: "[ERROR] Email parameter is required.", executionTime: 0, mode: "real" };
    const { stdout, stderr, exitCode } = await execTool({
      command: "holehe",
      args: [email, "--no-color"],
      timeout: 6e4
    });
    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real",
      executionTime: 0
    };
  }
};
var sherlockAdapter = {
  id: "sherlock",
  name: "Sherlock",
  description: "Find social media accounts by username across platforms",
  category: "osint",
  params: [
    { name: "username", label: "Target Username", type: "string", required: true, placeholder: "johndoe" },
    { name: "timeout", label: "Timeout (seconds)", type: "number", required: false, default: "30", placeholder: "30" }
  ],
  async checkInstalled() {
    return commandExists("sherlock");
  },
  async execute(params) {
    const username = params.username;
    if (!username) return { success: false, output: "[ERROR] Username parameter is required.", executionTime: 0, mode: "real" };
    const args = [username, "--print-found"];
    if (params.timeout) args.push("--timeout", params.timeout);
    const { stdout, stderr, exitCode } = await execTool({
      command: "sherlock",
      args,
      timeout: 12e4
    });
    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real",
      executionTime: 0
    };
  }
};
var nmapAdapter = {
  id: "nmap",
  name: "Nmap",
  description: "Network scanner & port mapper",
  category: "recon",
  params: [
    { name: "target", label: "Target (IP/hostname)", type: "string", required: true, placeholder: "192.168.1.1 or example.com" },
    { name: "scan_type", label: "Scan Type", type: "select", required: false, default: "-sV", options: ["-sS (SYN Scan)", "-sT (TCP Connect)", "-sV (Version Detection)", "-sU (UDP Scan)", "-A (Aggressive)"] },
    { name: "ports", label: "Ports (e.g. 1-1000)", type: "string", required: false, placeholder: "1-1000 or 80,443,8080" }
  ],
  async checkInstalled() {
    return commandExists("nmap");
  },
  async execute(params) {
    const target = params.target;
    if (!target) return { success: false, output: "[ERROR] Target parameter is required.", executionTime: 0, mode: "real" };
    const args = [];
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
      timeout: 18e4
      // 3 minutes for nmap
    });
    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real",
      executionTime: 0
    };
  }
};
var subfinderAdapter = {
  id: "subfinder",
  name: "Subfinder",
  description: "Fast passive subdomain enumeration tool",
  category: "recon",
  params: [
    { name: "domain", label: "Target Domain", type: "string", required: true, placeholder: "example.com" },
    { name: "recursive", label: "Recursive", type: "boolean", required: false, default: "false" }
  ],
  async checkInstalled() {
    return commandExists("subfinder");
  },
  async execute(params) {
    const domain = params.domain;
    if (!domain) return { success: false, output: "[ERROR] Domain parameter is required.", executionTime: 0, mode: "real" };
    const args = ["-d", domain, "-silent"];
    if (params.recursive === "true") args.push("-recursive");
    const { stdout, stderr, exitCode } = await execTool({
      command: "subfinder",
      args,
      timeout: 12e4
    });
    const subdomains = stdout.trim().split("\n").filter(Boolean);
    const output = `[SUBFINDER] Found ${subdomains.length} subdomains for ${domain}
${"\u2500".repeat(50)}
${stdout}`;
    return {
      success: exitCode === 0,
      output: output || stderr || "No subdomains found.",
      rawData: { count: subdomains.length, subdomains },
      mode: "real",
      executionTime: 0
    };
  }
};
var whoisAdapter = {
  id: "whois",
  name: "Whois",
  description: "Domain registration and ownership lookup",
  category: "recon",
  params: [
    { name: "target", label: "Domain or IP", type: "string", required: true, placeholder: "example.com or 8.8.8.8" }
  ],
  async checkInstalled() {
    return commandExists("whois");
  },
  async execute(params) {
    const target = params.target;
    if (!target) return { success: false, output: "[ERROR] Target parameter is required.", executionTime: 0, mode: "real" };
    const { stdout, stderr, exitCode } = await execTool({
      command: "whois",
      args: [target],
      timeout: 3e4
    });
    return {
      success: exitCode === 0,
      output: stdout || stderr || "No WHOIS data received.",
      mode: "real",
      executionTime: 0
    };
  }
};
var digAdapter = {
  id: "dig",
  name: "Dig (DNS Lookup)",
  description: "DNS record enumeration and lookup",
  category: "recon",
  params: [
    { name: "domain", label: "Domain", type: "string", required: true, placeholder: "example.com" },
    { name: "record_type", label: "Record Type", type: "select", required: false, default: "ANY", options: ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "ANY"] }
  ],
  async checkInstalled() {
    return commandExists("dig");
  },
  async execute(params) {
    const domain = params.domain;
    if (!domain) return { success: false, output: "[ERROR] Domain parameter is required.", executionTime: 0, mode: "real" };
    const recordType = params.record_type || "ANY";
    const { stdout, stderr, exitCode } = await execTool({
      command: "dig",
      args: [domain, recordType, "+noall", "+answer"],
      timeout: 15e3
    });
    const output = `[DIG] DNS Records for ${domain} (Type: ${recordType})
${"\u2500".repeat(50)}
${stdout || "No records found."}`;
    return {
      success: exitCode === 0,
      output: output || stderr,
      mode: "real",
      executionTime: 0
    };
  }
};
var niktoAdapter = {
  id: "nikto",
  name: "Nikto",
  description: "Web server vulnerability scanner",
  category: "web",
  params: [
    { name: "host", label: "Target URL/Host", type: "string", required: true, placeholder: "http://example.com" },
    { name: "port", label: "Port", type: "number", required: false, default: "80", placeholder: "80" }
  ],
  async checkInstalled() {
    return commandExists("nikto");
  },
  async execute(params) {
    const host = params.host;
    if (!host) return { success: false, output: "[ERROR] Host parameter is required.", executionTime: 0, mode: "real" };
    const args = ["-h", host, "-nointeractive"];
    if (params.port && params.port !== "80") args.push("-p", params.port);
    const { stdout, stderr, exitCode } = await execTool({
      command: "nikto",
      args,
      timeout: 3e5
      // 5 min for nikto
    });
    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real",
      executionTime: 0
    };
  }
};
var whatwebAdapter = {
  id: "whatweb",
  name: "WhatWeb",
  description: "Web technology fingerprinting and identification",
  category: "web",
  params: [
    { name: "target", label: "Target URL", type: "string", required: true, placeholder: "https://example.com" },
    { name: "aggression", label: "Aggression Level", type: "select", required: false, default: "1", options: ["1 (Stealthy)", "3 (Aggressive)", "4 (Heavy)"] }
  ],
  async checkInstalled() {
    return commandExists("whatweb");
  },
  async execute(params) {
    const target = params.target;
    if (!target) return { success: false, output: "[ERROR] Target URL is required.", executionTime: 0, mode: "real" };
    const aggression = params.aggression ? params.aggression.split(" ")[0] : "1";
    const { stdout, stderr, exitCode } = await execTool({
      command: "whatweb",
      args: [target, `-a${aggression}`, "--color=never"],
      timeout: 6e4
    });
    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real",
      executionTime: 0
    };
  }
};
var theHarvesterAdapter = {
  id: "theHarvester",
  name: "theHarvester",
  description: "Email and subdomain harvester from public sources",
  category: "recon",
  params: [
    { name: "domain", label: "Target Domain", type: "string", required: true, placeholder: "example.com" },
    { name: "source", label: "Data Source", type: "select", required: false, default: "all", options: ["all", "google", "bing", "linkedin", "twitter", "shodan", "dnsdumpster", "crtsh"] },
    { name: "limit", label: "Result Limit", type: "number", required: false, default: "100", placeholder: "100" }
  ],
  async checkInstalled() {
    return commandExists("theHarvester") || pythonPackageExists("theHarvester");
  },
  async execute(params) {
    const domain = params.domain;
    if (!domain) return { success: false, output: "[ERROR] Domain parameter is required.", executionTime: 0, mode: "real" };
    const source = params.source || "all";
    const limit = params.limit || "100";
    const { stdout, stderr, exitCode } = await execTool({
      command: "theHarvester",
      args: ["-d", domain, "-b", source, "-l", limit],
      timeout: 12e4
    });
    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real",
      executionTime: 0
    };
  }
};
var sqlmapAdapter = {
  id: "sqlmap",
  name: "SQLmap",
  description: "Automatic SQL injection detection and exploitation",
  category: "exploitation",
  params: [
    { name: "url", label: "Target URL (with parameter)", type: "string", required: true, placeholder: "http://example.com/page?id=1" },
    { name: "level", label: "Test Level (1-5)", type: "select", required: false, default: "1", options: ["1", "2", "3", "4", "5"] },
    { name: "risk", label: "Risk Level (1-3)", type: "select", required: false, default: "1", options: ["1", "2", "3"] }
  ],
  async checkInstalled() {
    return commandExists("sqlmap");
  },
  async execute(params) {
    const url = params.url;
    if (!url) return { success: false, output: "[ERROR] URL parameter is required.", executionTime: 0, mode: "real" };
    const args = ["-u", url, "--batch", "--random-agent"];
    if (params.level) args.push("--level", params.level);
    if (params.risk) args.push("--risk", params.risk);
    const { stdout, stderr, exitCode } = await execTool({
      command: "sqlmap",
      args,
      timeout: 18e4
    });
    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real",
      executionTime: 0
    };
  }
};
var hydraAdapter = {
  id: "hydra",
  name: "Hydra",
  description: "Fast network login cracker (brute force)",
  category: "exploitation",
  params: [
    { name: "target", label: "Target Host", type: "string", required: true, placeholder: "192.168.1.1" },
    { name: "service", label: "Service", type: "select", required: true, options: ["ssh", "ftp", "http-get", "http-post-form", "smtp", "mysql", "rdp", "vnc", "telnet"] },
    { name: "username", label: "Username (or file path)", type: "string", required: true, placeholder: "admin or /path/to/users.txt" },
    { name: "password_file", label: "Password File Path", type: "string", required: true, placeholder: "/path/to/wordlist.txt" }
  ],
  async checkInstalled() {
    return commandExists("hydra");
  },
  async execute(params) {
    const { target, service, username, password_file } = params;
    if (!target || !service || !username || !password_file) {
      return { success: false, output: "[ERROR] All parameters (target, service, username, password_file) are required.", executionTime: 0, mode: "real" };
    }
    const args = [];
    if (username.startsWith("/")) {
      args.push("-L", username);
    } else {
      args.push("-l", username);
    }
    args.push("-P", password_file, target, service);
    const { stdout, stderr, exitCode } = await execTool({
      command: "hydra",
      args,
      timeout: 3e5
    });
    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real",
      executionTime: 0
    };
  }
};
var gobusterAdapter = {
  id: "gobuster",
  name: "Gobuster",
  description: "Directory/file brute forcing tool",
  category: "web",
  params: [
    { name: "url", label: "Target URL", type: "string", required: true, placeholder: "http://example.com" },
    { name: "wordlist", label: "Wordlist Path", type: "string", required: true, placeholder: "/usr/share/wordlists/dirb/common.txt" },
    { name: "mode", label: "Mode", type: "select", required: false, default: "dir", options: ["dir", "dns", "vhost", "fuzz"] }
  ],
  async checkInstalled() {
    return commandExists("gobuster");
  },
  async execute(params) {
    const { url, wordlist, mode } = params;
    if (!url || !wordlist) {
      return { success: false, output: "[ERROR] URL and wordlist are required.", executionTime: 0, mode: "real" };
    }
    const scanMode = mode || "dir";
    const { stdout, stderr, exitCode } = await execTool({
      command: "gobuster",
      args: [scanMode, "-u", url, "-w", wordlist, "--no-color"],
      timeout: 3e5
    });
    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real",
      executionTime: 0
    };
  }
};
var nucleiAdapter = {
  id: "nuclei",
  name: "Nuclei",
  description: "Fast vulnerability scanner based on templates",
  category: "web",
  params: [
    { name: "target", label: "Target URL", type: "string", required: true, placeholder: "https://example.com" },
    { name: "severity", label: "Severity Filter", type: "select", required: false, options: ["info", "low", "medium", "high", "critical"] }
  ],
  async checkInstalled() {
    return commandExists("nuclei");
  },
  async execute(params) {
    const target = params.target;
    if (!target) return { success: false, output: "[ERROR] Target parameter is required.", executionTime: 0, mode: "real" };
    const args = ["-u", target, "-nc"];
    if (params.severity) args.push("-severity", params.severity);
    const { stdout, stderr, exitCode } = await execTool({
      command: "nuclei",
      args,
      timeout: 3e5
    });
    return {
      success: exitCode === 0,
      output: stdout || stderr || "No vulnerabilities found.",
      mode: "real",
      executionTime: 0
    };
  }
};
var httpxAdapter = {
  id: "httpx",
  name: "HTTPX",
  description: "Fast HTTP probing and technology detection",
  category: "recon",
  params: [
    { name: "target", label: "Target (URL or domain)", type: "string", required: true, placeholder: "example.com" },
    { name: "tech_detect", label: "Detect Technologies", type: "boolean", required: false, default: "true" }
  ],
  async checkInstalled() {
    return commandExists("httpx");
  },
  async execute(params) {
    const target = params.target;
    if (!target) return { success: false, output: "[ERROR] Target parameter is required.", executionTime: 0, mode: "real" };
    const args = ["-u", target, "-nc", "-title", "-status-code", "-content-length"];
    if (params.tech_detect === "true") args.push("-tech-detect");
    const { stdout, stderr, exitCode } = await execTool({
      command: "httpx",
      args,
      timeout: 6e4
    });
    return {
      success: exitCode === 0,
      output: stdout || stderr || "No output received.",
      mode: "real",
      executionTime: 0
    };
  }
};
var shodanAdapter = {
  id: "shodan",
  name: "Shodan",
  description: "Internet-connected device search engine (requires API key)",
  category: "recon",
  params: [
    { name: "target", label: "Target IP", type: "string", required: true, placeholder: "8.8.8.8" },
    { name: "api_key", label: "Shodan API Key", type: "string", required: true, placeholder: "YOUR_SHODAN_API_KEY" }
  ],
  async checkInstalled() {
    return commandExists("curl");
  },
  async execute(params) {
    const { target, api_key } = params;
    if (!target || !api_key) return { success: false, output: "[ERROR] Target IP and API key are required.", executionTime: 0, mode: "real" };
    const { stdout, stderr, exitCode } = await execTool({
      command: "curl",
      args: ["-s", `https://api.shodan.io/shodan/host/${target}?key=${api_key}`],
      timeout: 3e4
    });
    try {
      const data = JSON.parse(stdout);
      const formatted = [
        `[SHODAN] Results for ${target}`,
        "\u2500".repeat(50),
        `IP: ${data.ip_str || target}`,
        `Organization: ${data.org || "N/A"}`,
        `OS: ${data.os || "N/A"}`,
        `Ports: ${(data.ports || []).join(", ")}`,
        `Hostnames: ${(data.hostnames || []).join(", ")}`,
        `Country: ${data.country_name || "N/A"}`,
        `City: ${data.city || "N/A"}`,
        "",
        "\u2500\u2500\u2500 Services \u2500\u2500\u2500",
        ...(data.data || []).map((svc) => `  Port ${svc.port}/${svc.transport}: ${svc.product || ""} ${svc.version || ""}`)
      ].join("\n");
      return { success: true, output: formatted, rawData: data, mode: "real", executionTime: 0 };
    } catch {
      return { success: exitCode === 0, output: stdout || stderr, mode: "real", executionTime: 0 };
    }
  }
};
var allAdapters = [
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
  shodanAdapter
];

// server/tools/index.ts
for (const adapter of allAdapters) {
  toolRegistry.register(adapter);
}

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(() => {
      return { success: true };
    })
  }),
  // ============ AGENTS ============
  agents: router({
    list: protectedProcedure.query(async () => {
      return getAllAgents();
    }),
    get: protectedProcedure.input(z2.object({ slug: z2.string() })).query(async ({ input }) => {
      return getAgentBySlug(input.slug);
    }),
    updateStatus: protectedProcedure.input(z2.object({
      slug: z2.string(),
      status: z2.enum(["active", "idle", "busy", "error"])
    })).mutation(async ({ input }) => {
      await updateAgentStatus(input.slug, input.status);
      return { success: true };
    })
  }),
  // ============ CHAT ============
  chat: router({
    getMessages: protectedProcedure.input(z2.object({ agentSlug: z2.string(), limit: z2.number().optional() })).query(async ({ ctx, input }) => {
      const msgs = await getMessages(input.agentSlug, ctx.user.id, input.limit ?? 50);
      return msgs.reverse();
    }),
    sendMessage: protectedProcedure.input(z2.object({
      agentSlug: z2.string(),
      content: z2.string()
    })).mutation(async ({ ctx, input }) => {
      await createMessage({
        agentSlug: input.agentSlug,
        role: "user",
        content: input.content,
        userId: ctx.user.id
      });
      let systemPrompt = "You are Pegasus NEO Supervisor. You manage a team of specialized security agents. Analyze the user's request and determine which agent(s) should handle it. Available agents: Recon (network scanning), Research (intelligence gathering), Analysis (vulnerability assessment), Exploitation (exploit development), Web (web app testing), OSINT (open source intelligence).";
      if (input.agentSlug !== "supervisor") {
        const agent = await getAgentBySlug(input.agentSlug);
        if (agent?.systemPrompt) {
          systemPrompt = agent.systemPrompt;
        }
        await updateAgentStatus(input.agentSlug, "active");
      }
      if (input.agentSlug === "supervisor") {
        const config = await getSupervisorConfig(ctx.user.id);
        if (config?.systemPrompt) {
          systemPrompt = config.systemPrompt;
        }
      }
      const history = await getMessages(input.agentSlug, ctx.user.id, 10);
      const llmMessages = [
        { role: "system", content: systemPrompt },
        ...history.reverse().map((m) => ({
          role: m.role,
          content: m.content
        })),
        { role: "user", content: input.content }
      ];
      const response = await invokeLLM({ messages: llmMessages });
      const rawContent = response.choices?.[0]?.message?.content;
      const assistantContent = typeof rawContent === "string" ? rawContent : "I'm processing your request...";
      await createMessage({
        agentSlug: input.agentSlug,
        role: "assistant",
        content: assistantContent,
        userId: ctx.user.id
      });
      if (input.agentSlug === "supervisor") {
        const agentSlugs = ["recon", "research", "analysis", "exploitation", "web", "osint"];
        const mentionedAgents = agentSlugs.filter(
          (slug) => assistantContent.toLowerCase().includes(slug)
        );
        for (const slug of mentionedAgents) {
          await createTask({
            agentSlug: slug,
            title: `Task from Supervisor: ${input.content.substring(0, 100)}`,
            description: input.content,
            userId: ctx.user.id
          });
          await updateAgentStatus(slug, "busy");
        }
      }
      if (input.agentSlug !== "supervisor") {
        await updateAgentStatus(input.agentSlug, "idle");
      }
      return {
        role: "assistant",
        content: assistantContent
      };
    })
  }),
  // ============ TASKS ============
  tasks: router({
    getByAgent: protectedProcedure.input(z2.object({ agentSlug: z2.string() })).query(async ({ ctx, input }) => {
      return getTasksByAgent(input.agentSlug, ctx.user.id);
    }),
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return getAllActiveTasks(ctx.user.id);
    }),
    create: protectedProcedure.input(z2.object({
      agentSlug: z2.string(),
      title: z2.string(),
      description: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      await createTask({
        agentSlug: input.agentSlug,
        title: input.title,
        description: input.description ?? null,
        userId: ctx.user.id
      });
      await updateAgentStatus(input.agentSlug, "busy");
      return { success: true };
    }),
    updateStatus: protectedProcedure.input(z2.object({
      taskId: z2.number(),
      status: z2.enum(["pending", "running", "completed", "failed"]),
      result: z2.string().optional()
    })).mutation(async ({ input }) => {
      await updateTaskStatus(input.taskId, input.status, input.result);
      return { success: true };
    })
  }),
  // ============ SUPERVISOR CONFIG ============
  supervisorConfig: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getSupervisorConfig(ctx.user.id);
    }),
    save: protectedProcedure.input(z2.object({
      systemPrompt: z2.string(),
      routingRules: z2.record(z2.string(), z2.array(z2.string())).optional()
    })).mutation(async ({ ctx, input }) => {
      await upsertSupervisorConfig({
        userId: ctx.user.id,
        systemPrompt: input.systemPrompt,
        routingRules: input.routingRules ?? null
      });
      return { success: true };
    })
  }),
  // ============ DESKTOP SETTINGS ============
  desktopConfig: router({
    get: protectedProcedure.query(async () => {
      const config = readDesktopConfig();
      return {
        apiBaseUrl: config.apiBaseUrl,
        hasApiKey: config.apiKey.length > 0
      };
    }),
    save: protectedProcedure.input(z2.object({
      apiBaseUrl: z2.string().url().optional(),
      apiKey: z2.string().optional()
    })).mutation(async ({ input }) => {
      const existing = readDesktopConfig();
      const config = writeDesktopConfig({
        apiBaseUrl: existing.apiBaseUrl,
        apiKey: input.apiKey && input.apiKey.trim().length > 0 ? input.apiKey : existing.apiKey
      });
      return {
        apiBaseUrl: config.apiBaseUrl,
        hasApiKey: config.apiKey.length > 0
      };
    })
  }),
  // ============ TOOLBOX ============
  toolbox: router({
    getTools: protectedProcedure.query(async () => {
      const toolsWithStatus = await toolRegistry.getToolsWithStatus();
      const grouped = {};
      for (const tool of toolsWithStatus) {
        if (!grouped[tool.category]) grouped[tool.category] = [];
        grouped[tool.category].push(tool);
      }
      return grouped;
    }),
    checkInstalled: protectedProcedure.input(z2.object({ toolId: z2.string() })).query(async ({ input }) => {
      const installed = await toolRegistry.checkInstalled(input.toolId);
      return { toolId: input.toolId, installed };
    }),
    executeTool: protectedProcedure.input(z2.object({
      toolId: z2.string(),
      params: z2.record(z2.string(), z2.string()).optional()
    })).mutation(async ({ ctx, input }) => {
      const adapter = toolRegistry.get(input.toolId);
      if (adapter) {
        const result = await toolRegistry.execute(input.toolId, input.params || {});
        if (!result.success && result.output.includes("[NOT INSTALLED]")) {
          const toolMessages2 = [
            {
              role: "system",
              content: `You are simulating the output of the security tool "${input.toolId}" (${adapter.name}). The tool is NOT installed on this system, so generate realistic but clearly simulated output. Mark the output as [SIMULATED - Tool Not Installed] at the top. Tool description: ${adapter.description}. Parameters: ${JSON.stringify(input.params || {})}`
            },
            {
              role: "user",
              content: `Execute ${input.toolId} with parameters: ${JSON.stringify(input.params || {})}`
            }
          ];
          const response2 = await invokeLLM({ messages: toolMessages2 });
          const toolOutput2 = response2.choices?.[0]?.message?.content;
          const outputStr2 = typeof toolOutput2 === "string" ? toolOutput2 : "Tool execution completed (simulated).";
          return {
            toolId: input.toolId,
            output: outputStr2,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            mode: "simulated",
            installed: false
          };
        }
        return {
          toolId: input.toolId,
          output: result.output,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          mode: result.mode,
          installed: true,
          executionTime: result.executionTime,
          rawData: result.rawData
        };
      }
      const toolMessages = [
        {
          role: "system",
          content: `You are simulating the output of the security tool "${input.toolId}". This tool has no adapter registered. Generate realistic but clearly simulated output. Mark as [SIMULATED - No Adapter] at the top. Parameters: ${JSON.stringify(input.params || {})}`
        },
        {
          role: "user",
          content: `Execute ${input.toolId} with parameters: ${JSON.stringify(input.params || {})}`
        }
      ];
      const response = await invokeLLM({ messages: toolMessages });
      const toolOutput = response.choices?.[0]?.message?.content;
      const outputStr = typeof toolOutput === "string" ? toolOutput : "Tool execution completed (simulated).";
      return {
        toolId: input.toolId,
        output: outputStr,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        mode: "simulated",
        installed: false
      };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await getDesktopOwnerUser() ?? null;
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/embedded.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3847) {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
function serveDesktopStatic(app) {
  const distPath = process.env.PEGASUS_STATIC_DIR || path3.resolve(import.meta.dirname, "..", "dist-client");
  if (!fs3.existsSync(distPath)) {
    throw new Error(`Desktop frontend build not found: ${distPath}`);
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path3.join(distPath, "index.html"));
  });
}
async function startServer(preferredPort = Number(process.env.PORT || 3847)) {
  process.env.PEGASUS_DESKTOP = "1";
  process.env.NODE_ENV = "production";
  process.env.OWNER_OPEN_ID ||= "owner";
  process.env.OWNER_NAME ||= "Admin";
  process.env.LM_STUDIO_API_BASE ||= "http://127.0.0.1:1234/v1";
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  serveDesktopStatic(app);
  const port = await findAvailablePort(preferredPort);
  await new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve());
  });
  return {
    port,
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    })
  };
}
export {
  startServer
};
