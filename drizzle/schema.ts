import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamp = (name: string) =>
  integer(name, { mode: "timestamp" }).default(sql`(unixepoch())`).notNull();

/**
 * Core user table backing desktop auth flow.
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Agents table - stores agent definitions and their current state.
 */
export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category", {
    enum: ["recon", "research", "analysis", "exploitation", "web", "osint"],
  }).notNull(),
  status: text("status", { enum: ["active", "idle", "busy", "error"] })
    .default("idle")
    .notNull(),
  systemPrompt: text("systemPrompt"),
  tools: text("tools", { mode: "json" }).$type<string[]>(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Messages table - stores chat messages for supervisor and individual agents.
 */
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentSlug: text("agentSlug").notNull(),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  userId: integer("userId").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt"),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Tasks table - stores tasks assigned to agents.
 */
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentSlug: text("agentSlug").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] })
    .default("pending")
    .notNull(),
  result: text("result"),
  userId: integer("userId").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Supervisor config - stores customizable prompt and routing rules.
 */
export const supervisorConfig = sqliteTable("supervisor_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  systemPrompt: text("systemPrompt").notNull(),
  routingRules: text("routingRules", { mode: "json" }).$type<Record<string, string[]>>(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export type SupervisorConfig = typeof supervisorConfig.$inferSelect;
export type InsertSupervisorConfig = typeof supervisorConfig.$inferInsert;
