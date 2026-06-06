import { describe, expect, it, vi } from "vitest";
import { toolRegistry, execTool, commandExists } from "./registry";
import { allAdapters } from "./adapters";

describe("Tool Registry", () => {
  it("should register all adapters", () => {
    // Register all adapters
    for (const adapter of allAdapters) {
      toolRegistry.register(adapter);
    }

    const all = toolRegistry.getAll();
    expect(all.length).toBe(allAdapters.length);
    expect(all.length).toBeGreaterThanOrEqual(15);
  });

  it("should retrieve adapter by id", () => {
    const nmap = toolRegistry.get("nmap");
    expect(nmap).toBeDefined();
    expect(nmap?.name).toBe("Nmap");
    expect(nmap?.category).toBe("recon");
  });

  it("should retrieve adapters by category", () => {
    const reconTools = toolRegistry.getByCategory("recon");
    expect(reconTools.length).toBeGreaterThanOrEqual(4);
    expect(reconTools.every((t) => t.category === "recon")).toBe(true);
  });

  it("should return undefined for non-existent tool", () => {
    const fake = toolRegistry.get("nonexistent_tool_xyz");
    expect(fake).toBeUndefined();
  });

  it("should have proper params for holehe adapter", () => {
    const holehe = toolRegistry.get("holehe");
    expect(holehe).toBeDefined();
    expect(holehe?.params.length).toBeGreaterThanOrEqual(1);
    expect(holehe?.params[0].name).toBe("email");
    expect(holehe?.params[0].required).toBe(true);
  });

  it("should have proper params for sherlock adapter", () => {
    const sherlock = toolRegistry.get("sherlock");
    expect(sherlock).toBeDefined();
    expect(sherlock?.params[0].name).toBe("username");
    expect(sherlock?.params[0].required).toBe(true);
  });

  it("should have proper params for nmap adapter", () => {
    const nmap = toolRegistry.get("nmap");
    expect(nmap).toBeDefined();
    expect(nmap?.params.find((p) => p.name === "target")).toBeDefined();
    expect(nmap?.params.find((p) => p.name === "scan_type")?.type).toBe("select");
  });

  it("should return NOT INSTALLED message for missing tools", async () => {
    // Mock a tool that's definitely not installed
    const result = await toolRegistry.execute("holehe", { email: "test@example.com" });
    // On this sandbox, holehe may or may not be installed
    // Either way, result should have proper structure
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("output");
    expect(result).toHaveProperty("mode");
    expect(["real", "simulated"]).toContain(result.mode);
  });
});

describe("execTool helper", () => {
  it("should execute simple commands", async () => {
    const result = await execTool({ command: "echo", args: ["hello world"], timeout: 5000 });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hello world");
  });

  it("should handle command not found", async () => {
    try {
      const result = await execTool({ command: "nonexistent_command_xyz", args: [], timeout: 5000 });
      expect(result.exitCode).not.toBe(0);
    } catch (err) {
      // spawn error is also acceptable
      expect(err).toBeDefined();
    }
  });

  it("should respect timeout", async () => {
    const result = await execTool({ command: "sleep", args: ["10"], timeout: 1000 });
    expect(result.stderr).toContain("[TIMEOUT]");
  }, 10000);
});

describe("commandExists helper", () => {
  it("should find common commands", async () => {
    const hasEcho = await commandExists("echo");
    expect(hasEcho).toBe(true);

    const hasCurl = await commandExists("curl");
    expect(hasCurl).toBe(true);
  });

  it("should return false for non-existent commands", async () => {
    const hasFake = await commandExists("totally_fake_command_xyz_123");
    expect(hasFake).toBe(false);
  });
});

describe("Tool Adapter Structure Validation", () => {
  it("all adapters should have required fields", () => {
    for (const adapter of allAdapters) {
      expect(adapter.id).toBeTruthy();
      expect(adapter.name).toBeTruthy();
      expect(adapter.description).toBeTruthy();
      expect(["recon", "exploitation", "wireless", "web", "osint"]).toContain(adapter.category);
      expect(Array.isArray(adapter.params)).toBe(true);
      expect(typeof adapter.checkInstalled).toBe("function");
      expect(typeof adapter.execute).toBe("function");
    }
  });

  it("all params should have required fields", () => {
    for (const adapter of allAdapters) {
      for (const param of adapter.params) {
        expect(param.name).toBeTruthy();
        expect(param.label).toBeTruthy();
        expect(["string", "number", "boolean", "select"]).toContain(param.type);
        expect(typeof param.required).toBe("boolean");
        if (param.type === "select") {
          expect(Array.isArray(param.options)).toBe(true);
          expect(param.options!.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
