import "dotenv/config";
import express from "express";
import fs from "fs";
import { createServer, type Server } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3847): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function serveDesktopStatic(app: express.Express) {
  const distPath =
    process.env.PEGASUS_STATIC_DIR ||
    path.resolve(import.meta.dirname, "..", "dist-client");

  if (!fs.existsSync(distPath)) {
    throw new Error(`Desktop frontend build not found: ${distPath}`);
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

export async function startServer(preferredPort = Number(process.env.PORT || 3847)) {
  process.env.PEGASUS_DESKTOP = "1";
  process.env.NODE_ENV = "production";
  process.env.OWNER_OPEN_ID ||= "owner";
  process.env.OWNER_NAME ||= "Admin";
  process.env.LM_STUDIO_API_BASE ||= "http://127.0.0.1:1234/v1";

  const app = express();
  const server: Server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  serveDesktopStatic(app);

  const port = await findAvailablePort(preferredPort);
  await new Promise<void>((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve());
  });

  return {
    port,
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    }),
  };
}
