import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "mock-id",
    created: Date.now(),
    model: "mock-model",
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: "I will delegate this to the Recon agent for network scanning.",
      },
      finish_reason: "stop",
    }],
  }),
}));

// Mock the database module
vi.mock("./db", () => ({
  getAllAgents: vi.fn().mockResolvedValue([
    { id: 1, slug: "recon", name: "Recon Agent", description: "Network scanning", category: "recon", status: "idle", tools: ["nmap", "shodan"], systemPrompt: "You are a recon agent.", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, slug: "research", name: "Research Agent", description: "Intelligence gathering", category: "research", status: "idle", tools: ["maltego"], systemPrompt: "You are a research agent.", createdAt: new Date(), updatedAt: new Date() },
    { id: 3, slug: "analysis", name: "Analysis Agent", description: "Vulnerability assessment", category: "analysis", status: "idle", tools: ["nikto"], systemPrompt: "You are an analysis agent.", createdAt: new Date(), updatedAt: new Date() },
    { id: 4, slug: "exploitation", name: "Exploitation Agent", description: "Exploit development", category: "exploitation", status: "idle", tools: ["metasploit"], systemPrompt: "You are an exploitation agent.", createdAt: new Date(), updatedAt: new Date() },
    { id: 5, slug: "web", name: "Web Agent", description: "Web app testing", category: "web", status: "idle", tools: ["burpsuite"], systemPrompt: "You are a web agent.", createdAt: new Date(), updatedAt: new Date() },
    { id: 6, slug: "osint", name: "OSINT Agent", description: "Open source intelligence", category: "osint", status: "idle", tools: ["email_harvester"], systemPrompt: "You are an OSINT agent.", createdAt: new Date(), updatedAt: new Date() },
  ]),
  getAgentBySlug: vi.fn().mockImplementation((slug: string) => {
    const agents: Record<string, unknown> = {
      recon: { id: 1, slug: "recon", name: "Recon Agent", description: "Network scanning", category: "recon", status: "idle", tools: ["nmap"], systemPrompt: "You are a recon agent.", createdAt: new Date(), updatedAt: new Date() },
    };
    return Promise.resolve(agents[slug] || undefined);
  }),
  updateAgentStatus: vi.fn().mockResolvedValue(undefined),
  getMessages: vi.fn().mockResolvedValue([]),
  createMessage: vi.fn().mockResolvedValue(null),
  getTasksByAgent: vi.fn().mockResolvedValue([]),
  getAllActiveTasks: vi.fn().mockResolvedValue([]),
  createTask: vi.fn().mockResolvedValue(null),
  updateTaskStatus: vi.fn().mockResolvedValue(undefined),
  getSupervisorConfig: vi.fn().mockResolvedValue(null),
  upsertSupervisorConfig: vi.fn().mockResolvedValue(undefined),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("agents router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createAuthContext();
    vi.clearAllMocks();
  });

  it("lists all agents", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.agents.list();

    expect(result).toHaveLength(6);
    expect(result[0].slug).toBe("recon");
    expect(result[5].slug).toBe("osint");
  });

  it("gets a specific agent by slug", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.agents.get({ slug: "recon" });

    expect(result).toBeDefined();
    expect(result?.name).toBe("Recon Agent");
    expect(result?.category).toBe("recon");
  });

  it("updates agent status", async () => {
    const { updateAgentStatus } = await import("./db");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.agents.updateStatus({ slug: "recon", status: "active" });

    expect(result.success).toBe(true);
    expect(updateAgentStatus).toHaveBeenCalledWith("recon", "active");
  });
});

describe("chat router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createAuthContext();
    vi.clearAllMocks();
  });

  it("gets messages for an agent", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chat.getMessages({ agentSlug: "supervisor" });

    expect(Array.isArray(result)).toBe(true);
  });

  it("sends a message to supervisor and gets LLM response", async () => {
    const { createMessage, createTask } = await import("./db");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chat.sendMessage({
      agentSlug: "supervisor",
      content: "Scan the network 192.168.1.0/24",
    });

    expect(result.role).toBe("assistant");
    expect(result.content).toContain("Recon");
    // Should save user message and assistant message
    expect(createMessage).toHaveBeenCalledTimes(2);
    // Should create a task for recon agent since response mentions "recon"
    expect(createTask).toHaveBeenCalled();
  });

  it("sends a message to a specific agent", async () => {
    const { createMessage, updateAgentStatus } = await import("./db");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chat.sendMessage({
      agentSlug: "recon",
      content: "Scan port 80 on target",
    });

    expect(result.role).toBe("assistant");
    expect(createMessage).toHaveBeenCalledTimes(2);
    // Agent should be set to active then back to idle
    expect(updateAgentStatus).toHaveBeenCalledWith("recon", "active");
    expect(updateAgentStatus).toHaveBeenCalledWith("recon", "idle");
  });
});

describe("tasks router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createAuthContext();
    vi.clearAllMocks();
  });

  it("gets all tasks", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a task for an agent", async () => {
    const { createTask, updateAgentStatus } = await import("./db");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.create({
      agentSlug: "recon",
      title: "Port scan 192.168.1.1",
      description: "Full TCP port scan",
    });

    expect(result.success).toBe(true);
    expect(createTask).toHaveBeenCalled();
    expect(updateAgentStatus).toHaveBeenCalledWith("recon", "busy");
  });

  it("updates task status", async () => {
    const { updateTaskStatus } = await import("./db");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tasks.updateStatus({
      taskId: 1,
      status: "completed",
      result: "Found 3 open ports",
    });

    expect(result.success).toBe(true);
    expect(updateTaskStatus).toHaveBeenCalledWith(1, "completed", "Found 3 open ports");
  });
});

describe("supervisorConfig router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createAuthContext();
    vi.clearAllMocks();
  });

  it("gets supervisor config", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.supervisorConfig.get();
    // Returns null since mock returns null
    expect(result).toBeNull();
  });

  it("saves supervisor config", async () => {
    const { upsertSupervisorConfig } = await import("./db");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.supervisorConfig.save({
      systemPrompt: "Custom supervisor prompt",
      routingRules: { recon: ["network", "scan"] },
    });

    expect(result.success).toBe(true);
    expect(upsertSupervisorConfig).toHaveBeenCalledWith({
      userId: 1,
      systemPrompt: "Custom supervisor prompt",
      routingRules: { recon: ["network", "scan"] },
    });
  });
});

describe("toolbox router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createAuthContext();
    vi.clearAllMocks();
  });

  it("returns categorized tools", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.toolbox.getTools();

    expect(result.recon).toBeDefined();
    expect(result.exploitation).toBeDefined();
    expect(result.web).toBeDefined();
    expect(result.osint).toBeDefined();
    expect(result.recon.length).toBeGreaterThan(0);
    expect(result.recon[0]).toHaveProperty("id");
    expect(result.recon[0]).toHaveProperty("name");
    expect(result.recon[0]).toHaveProperty("description");
    expect(result.recon[0]).toHaveProperty("installed");
    expect(result.recon[0]).toHaveProperty("params");
  });

  it("executes a tool and returns output", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.toolbox.executeTool({
      toolId: "nmap",
      params: { target: "192.168.1.1" },
    });

    expect(result.toolId).toBe("nmap");
    expect(result.output).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.mode).toBeDefined();
    expect(["real", "simulated"]).toContain(result.mode);
  });
});
