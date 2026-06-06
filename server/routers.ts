import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getAllAgents,
  getAgentBySlug,
  updateAgentStatus,
  getMessages,
  createMessage,
  getTasksByAgent,
  getAllActiveTasks,
  createTask,
  updateTaskStatus,
  getSupervisorConfig,
  upsertSupervisorConfig,
} from "./db";
import { invokeLLM, type Message as LLMMessage } from "./_core/llm";
import { readDesktopConfig, writeDesktopConfig } from "./desktopConfig";
import { toolRegistry } from "./tools";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(() => {
      return { success: true } as const;
    }),
  }),

  // ============ AGENTS ============
  agents: router({
    list: protectedProcedure.query(async () => {
      return getAllAgents();
    }),

    get: protectedProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getAgentBySlug(input.slug);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        slug: z.string(),
        status: z.enum(["active", "idle", "busy", "error"]),
      }))
      .mutation(async ({ input }) => {
        await updateAgentStatus(input.slug, input.status);
        return { success: true };
      }),
  }),

  // ============ CHAT ============
  chat: router({
    getMessages: protectedProcedure
      .input(z.object({ agentSlug: z.string(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const msgs = await getMessages(input.agentSlug, ctx.user.id, input.limit ?? 50);
        return msgs.reverse(); // oldest first for display
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        agentSlug: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Save user message
        await createMessage({
          agentSlug: input.agentSlug,
          role: "user",
          content: input.content,
          userId: ctx.user.id,
        });

        // Get agent info for system prompt
        let systemPrompt = "You are Pegasus NEO Supervisor. You manage a team of specialized security agents. Analyze the user's request and determine which agent(s) should handle it. Available agents: Recon (network scanning), Research (intelligence gathering), Analysis (vulnerability assessment), Exploitation (exploit development), Web (web app testing), OSINT (open source intelligence).";

        if (input.agentSlug !== "supervisor") {
          const agent = await getAgentBySlug(input.agentSlug);
          if (agent?.systemPrompt) {
            systemPrompt = agent.systemPrompt;
          }
          // Mark agent as active
          await updateAgentStatus(input.agentSlug, "active");
        }

        // Check for custom supervisor config
        if (input.agentSlug === "supervisor") {
          const config = await getSupervisorConfig(ctx.user.id);
          if (config?.systemPrompt) {
            systemPrompt = config.systemPrompt;
          }
        }

        // Get conversation history
        const history = await getMessages(input.agentSlug, ctx.user.id, 10);
        const llmMessages: LLMMessage[] = [
          { role: "system", content: systemPrompt },
          ...history.reverse().map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: input.content },
        ];

        // Call LLM
        const response = await invokeLLM({ messages: llmMessages });
        const rawContent = response.choices?.[0]?.message?.content;
        const assistantContent = typeof rawContent === "string" ? rawContent : "I'm processing your request...";

        // Save assistant response
        await createMessage({
          agentSlug: input.agentSlug,
          role: "assistant",
          content: assistantContent,
          userId: ctx.user.id,
        });

        // If supervisor, check if we need to route to agents
        if (input.agentSlug === "supervisor") {
          // Try to detect agent routing from the response
          const agentSlugs = ["recon", "research", "analysis", "exploitation", "web", "osint"];
          const mentionedAgents = agentSlugs.filter(slug =>
            assistantContent.toLowerCase().includes(slug)
          );

          // Create tasks for mentioned agents
          for (const slug of mentionedAgents) {
            await createTask({
              agentSlug: slug,
              title: `Task from Supervisor: ${input.content.substring(0, 100)}`,
              description: input.content,
              userId: ctx.user.id,
            });
            await updateAgentStatus(slug, "busy");
          }
        }

        // Reset agent to idle after response
        if (input.agentSlug !== "supervisor") {
          await updateAgentStatus(input.agentSlug, "idle");
        }

        return {
          role: "assistant" as const,
          content: assistantContent,
        };
      }),
  }),

  // ============ TASKS ============
  tasks: router({
    getByAgent: protectedProcedure
      .input(z.object({ agentSlug: z.string() }))
      .query(async ({ ctx, input }) => {
        return getTasksByAgent(input.agentSlug, ctx.user.id);
      }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
      return getAllActiveTasks(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        agentSlug: z.string(),
        title: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createTask({
          agentSlug: input.agentSlug,
          title: input.title,
          description: input.description ?? null,
          userId: ctx.user.id,
        });
        await updateAgentStatus(input.agentSlug, "busy");
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        status: z.enum(["pending", "running", "completed", "failed"]),
        result: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateTaskStatus(input.taskId, input.status, input.result);
        return { success: true };
      }),
  }),

  // ============ SUPERVISOR CONFIG ============
  supervisorConfig: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getSupervisorConfig(ctx.user.id);
    }),

    save: protectedProcedure
      .input(z.object({
        systemPrompt: z.string(),
        routingRules: z.record(z.string(), z.array(z.string())).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertSupervisorConfig({
          userId: ctx.user.id,
          systemPrompt: input.systemPrompt,
          routingRules: input.routingRules ?? null,
        });
        return { success: true };
      }),
  }),

  // ============ DESKTOP SETTINGS ============
  desktopConfig: router({
    get: protectedProcedure.query(async () => {
      const config = readDesktopConfig();
      return {
        apiBaseUrl: config.apiBaseUrl,
        hasApiKey: config.apiKey.length > 0,
      };
    }),

    save: protectedProcedure
      .input(z.object({
        apiBaseUrl: z.string().url().optional(),
        apiKey: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = readDesktopConfig();
        const config = writeDesktopConfig({
          apiBaseUrl: existing.apiBaseUrl,
          apiKey: input.apiKey && input.apiKey.trim().length > 0
            ? input.apiKey
            : existing.apiKey,
        });
        return {
          apiBaseUrl: config.apiBaseUrl,
          hasApiKey: config.apiKey.length > 0,
        };
      }),
  }),

  // ============ TOOLBOX ============
  toolbox: router({
    getTools: protectedProcedure.query(async () => {
      // Return tools from the real registry with installation status
      const toolsWithStatus = await toolRegistry.getToolsWithStatus();

      // Group by category
      const grouped: Record<string, Array<{ id: string; name: string; description: string; installed: boolean; params: any[] }>> = {};
      for (const tool of toolsWithStatus) {
        if (!grouped[tool.category]) grouped[tool.category] = [];
        grouped[tool.category].push(tool);
      }

      return grouped;
    }),

    checkInstalled: protectedProcedure
      .input(z.object({ toolId: z.string() }))
      .query(async ({ input }) => {
        const installed = await toolRegistry.checkInstalled(input.toolId);
        return { toolId: input.toolId, installed };
      }),

    executeTool: protectedProcedure
      .input(z.object({
        toolId: z.string(),
        params: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const adapter = toolRegistry.get(input.toolId);

        // If adapter exists in registry, try real execution
        if (adapter) {
          const result = await toolRegistry.execute(input.toolId, input.params || {});

          // If tool is not installed, fall back to LLM simulation
          if (!result.success && result.output.includes("[NOT INSTALLED]")) {
            const toolMessages: LLMMessage[] = [
              {
                role: "system",
                content: `You are simulating the output of the security tool "${input.toolId}" (${adapter.name}). The tool is NOT installed on this system, so generate realistic but clearly simulated output. Mark the output as [SIMULATED - Tool Not Installed] at the top. Tool description: ${adapter.description}. Parameters: ${JSON.stringify(input.params || {})}`,
              },
              {
                role: "user",
                content: `Execute ${input.toolId} with parameters: ${JSON.stringify(input.params || {})}`,
              },
            ];
            const response = await invokeLLM({ messages: toolMessages });
            const toolOutput = response.choices?.[0]?.message?.content;
            const outputStr = typeof toolOutput === "string" ? toolOutput : "Tool execution completed (simulated).";

            return {
              toolId: input.toolId,
              output: outputStr,
              timestamp: new Date().toISOString(),
              mode: "simulated" as const,
              installed: false,
            };
          }

          return {
            toolId: input.toolId,
            output: result.output,
            timestamp: new Date().toISOString(),
            mode: result.mode,
            installed: true,
            executionTime: result.executionTime,
            rawData: result.rawData,
          };
        }

        // Tool not in registry at all - pure LLM simulation
        const toolMessages: LLMMessage[] = [
          {
            role: "system",
            content: `You are simulating the output of the security tool "${input.toolId}". This tool has no adapter registered. Generate realistic but clearly simulated output. Mark as [SIMULATED - No Adapter] at the top. Parameters: ${JSON.stringify(input.params || {})}`,
          },
          {
            role: "user",
            content: `Execute ${input.toolId} with parameters: ${JSON.stringify(input.params || {})}`,
          },
        ];
        const response = await invokeLLM({ messages: toolMessages });
        const toolOutput = response.choices?.[0]?.message?.content;
        const outputStr = typeof toolOutput === "string" ? toolOutput : "Tool execution completed (simulated).";

        return {
          toolId: input.toolId,
          output: outputStr,
          timestamp: new Date().toISOString(),
          mode: "simulated" as const,
          installed: false,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
