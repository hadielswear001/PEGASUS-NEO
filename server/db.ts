import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import type {
  Agent,
  InsertMessage,
  InsertSupervisorConfig,
  InsertTask,
  InsertUser,
  Message,
  SupervisorConfig,
  Task,
  User,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

type Sqlite = Database.Database;

let _db: Sqlite | null = null;

const appSupportDir = () =>
  process.env.PEGASUS_APP_SUPPORT_DIR ||
  path.join(os.homedir(), "Library", "Application Support", "PegasusNEO");

export const getDatabasePath = () =>
  process.env.PEGASUS_DB_PATH || path.join(appSupportDir(), "pegasus.db");

const toDate = (value: unknown) => {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value * 1000);
  if (typeof value === "string") return new Date(value);
  return new Date();
};

const toUnix = (value: unknown) => {
  const date = toDate(value);
  return Math.floor(date.getTime() / 1000);
};

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const mapUser = (row: any): User => ({
  ...row,
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
  lastSignedIn: toDate(row.lastSignedIn),
});

const mapAgent = (row: any): Agent => ({
  ...row,
  tools: parseJson<string[]>(row.tools, []),
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
});

const mapMessage = (row: any): Message => ({
  ...row,
  metadata: parseJson<Record<string, unknown> | null>(row.metadata, null),
  createdAt: toDate(row.createdAt),
});

const mapTask = (row: any): Task => ({
  ...row,
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
});

const mapSupervisorConfig = (row: any): SupervisorConfig => ({
  ...row,
  routingRules: parseJson<Record<string, string[]> | null>(row.routingRules, null),
  createdAt: toDate(row.createdAt),
  updatedAt: toDate(row.updatedAt),
});

const DEFAULT_AGENTS = [
  {
    name: "Recon Agent",
    slug: "recon",
    description: "Network scanning, port enumeration, service discovery",
    category: "recon",
    systemPrompt:
      "You are the Recon Agent. You specialize in network reconnaissance, port scanning, service enumeration, and infrastructure mapping. Always provide open ports, running services, OS hints, and potential entry points.",
    tools: ["nmap", "subfinder", "whois", "dig", "amass"],
  },
  {
    name: "Research Agent",
    slug: "research",
    description: "Deep OSINT, intelligence gathering, data correlation",
    category: "research",
    systemPrompt:
      "You are the Research Agent. You specialize in intelligence gathering, data correlation, and threat research from public sources.",
    tools: ["theHarvester", "sherlock", "holehe", "whois", "subfinder"],
  },
  {
    name: "Analysis Agent",
    slug: "analysis",
    description: "Vulnerability assessment, code review, risk analysis",
    category: "analysis",
    systemPrompt:
      "You are the Analysis Agent. You assess scan results, identify likely vulnerabilities, rank severity, and recommend remediation.",
    tools: ["nuclei", "nikto", "whatweb", "httpx"],
  },
  {
    name: "Exploitation Agent",
    slug: "exploitation",
    description: "Exploit development, payload generation, post-exploitation",
    category: "exploitation",
    systemPrompt:
      "You are the Exploitation Agent. You plan validation steps for confirmed vulnerabilities while respecting legal scope and user authorization.",
    tools: ["sqlmap", "hydra"],
  },
  {
    name: "Web Agent",
    slug: "web",
    description: "Web application testing, XSS/SQLi detection, CMS scanning",
    category: "web",
    systemPrompt:
      "You are the Web Agent. You specialize in OWASP-aligned web application testing, technology fingerprinting, and web attack surface mapping.",
    tools: ["nikto", "whatweb", "gobuster", "ffuf", "wpscan", "xsstrike"],
  },
  {
    name: "OSINT Agent",
    slug: "osint",
    description: "Social media tracking, email analysis, digital footprinting",
    category: "osint",
    systemPrompt:
      "You are the OSINT Agent. You gather public intelligence ethically, focusing on email, username, domain, and infrastructure footprinting.",
    tools: ["holehe", "sherlock", "theHarvester", "whois"],
  },
] as const;

function ensureSchema(db: Sqlite) {
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

function seedAgents(db: Sqlite) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM agents").get() as { count: number };
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

export async function getDb() {
  if (_db) return _db;

  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  _db = new Database(dbPath);
  ensureSchema(_db);
  seedAgents(_db);
  return _db;
}

// ============ USER QUERIES ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
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
    lastSignedIn,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  const row = db.prepare("SELECT * FROM users WHERE openId = ? LIMIT 1").get(openId);
  return row ? mapUser(row) : undefined;
}

export async function getDesktopOwnerUser() {
  const openId = ENV.ownerOpenId || "owner";
  await upsertUser({
    openId,
    name: process.env.OWNER_NAME || "Admin",
    email: null,
    loginMethod: "desktop",
    role: "admin",
    lastSignedIn: new Date(),
  });
  return getUserByOpenId(openId);
}

// ============ AGENT QUERIES ============

export async function getAllAgents() {
  const db = await getDb();
  return db
    .prepare("SELECT * FROM agents ORDER BY id ASC")
    .all()
    .map(mapAgent);
}

export async function getAgentBySlug(slug: string) {
  const db = await getDb();
  const row = db.prepare("SELECT * FROM agents WHERE slug = ? LIMIT 1").get(slug);
  return row ? mapAgent(row) : undefined;
}

export async function updateAgentStatus(slug: string, status: "active" | "idle" | "busy" | "error") {
  const db = await getDb();
  db.prepare("UPDATE agents SET status = ?, updatedAt = unixepoch() WHERE slug = ?").run(status, slug);
}

// ============ MESSAGE QUERIES ============

export async function getMessages(agentSlug: string, userId: number, limit = 50) {
  const db = await getDb();
  return db
    .prepare("SELECT * FROM messages WHERE agentSlug = ? AND userId = ? ORDER BY createdAt DESC LIMIT ?")
    .all(agentSlug, userId, limit)
    .map(mapMessage);
}

export async function createMessage(msg: InsertMessage) {
  const db = await getDb();
  const result = db.prepare(`
    INSERT INTO messages (agentSlug, role, content, userId, metadata)
    VALUES (@agentSlug, @role, @content, @userId, @metadata)
  `).run({
    agentSlug: msg.agentSlug,
    role: msg.role,
    content: msg.content,
    userId: msg.userId,
    metadata: msg.metadata ? JSON.stringify(msg.metadata) : null,
  });
  return result;
}

// ============ TASK QUERIES ============

export async function getTasksByAgent(agentSlug: string, userId: number) {
  const db = await getDb();
  return db
    .prepare("SELECT * FROM tasks WHERE agentSlug = ? AND userId = ? ORDER BY createdAt DESC LIMIT 20")
    .all(agentSlug, userId)
    .map(mapTask);
}

export async function getAllActiveTasks(userId: number) {
  const db = await getDb();
  return db
    .prepare("SELECT * FROM tasks WHERE userId = ? ORDER BY createdAt DESC LIMIT 50")
    .all(userId)
    .map(mapTask);
}

export async function createTask(task: InsertTask) {
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
    userId: task.userId,
  });
}

export async function updateTaskStatus(
  taskId: number,
  status: "pending" | "running" | "completed" | "failed",
  result?: string,
) {
  const db = await getDb();
  db.prepare(`
    UPDATE tasks
    SET status = @status,
        result = COALESCE(@result, result),
        updatedAt = unixepoch()
    WHERE id = @taskId
  `).run({ taskId, status, result: result ?? null });
}

// ============ SUPERVISOR CONFIG QUERIES ============

export async function getSupervisorConfig(userId: number) {
  const db = await getDb();
  const row = db.prepare("SELECT * FROM supervisor_config WHERE userId = ? LIMIT 1").get(userId);
  return row ? mapSupervisorConfig(row) : undefined;
}

export async function upsertSupervisorConfig(config: InsertSupervisorConfig) {
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
    routingRules: config.routingRules ? JSON.stringify(config.routingRules) : null,
  });
}
