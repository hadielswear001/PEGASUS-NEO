import { toolRegistry } from "./registry";
import { allAdapters } from "./adapters";

// Register all tool adapters
for (const adapter of allAdapters) {
  toolRegistry.register(adapter);
}

export { toolRegistry } from "./registry";
export type { ToolResult, ToolParam, ToolAdapter } from "./registry";
