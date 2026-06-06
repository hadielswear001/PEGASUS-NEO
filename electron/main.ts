import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { startServer } from "../server/embedded";

const require = createRequire(import.meta.url);
const { app, BrowserWindow, shell } = require("electron");

type EmbeddedServer = {
  port: number;
  url: string;
  close: () => Promise<void>;
};

let mainWindow: BrowserWindow | null = null;
let server: EmbeddedServer | null = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function appRoot() {
  return app.isPackaged
    ? app.getAppPath()
    : path.resolve(__dirname, "..");
}

function pegasusSupportDir() {
  return path.join(app.getPath("appData"), "PegasusNEO");
}

function writeRuntimeLog(message: string, error?: unknown) {
  try {
    const supportDir = pegasusSupportDir();
    fs.mkdirSync(supportDir, { recursive: true });
    const detail =
      error instanceof Error
        ? `${error.stack || error.message}`
        : error === undefined
          ? ""
          : String(error);
    fs.appendFileSync(
      path.join(supportDir, "desktop-runtime.log"),
      `[${new Date().toISOString()}] ${message}${detail ? `\n${detail}` : ""}\n`,
    );
  } catch {
    // Logging must never become a startup dependency.
  }
}

async function startEmbeddedServer() {
  const root = appRoot();
  const supportDir = pegasusSupportDir();
  fs.mkdirSync(supportDir, { recursive: true });
  writeRuntimeLog(`Starting embedded server. root=${root} supportDir=${supportDir}`);

  process.env.PEGASUS_DESKTOP = "1";
  process.env.PEGASUS_APP_SUPPORT_DIR = supportDir;
  process.env.PEGASUS_STATIC_DIR = path.join(root, "dist-client");
  process.env.NODE_ENV = "production";
  process.env.OWNER_OPEN_ID ||= "owner";
  process.env.OWNER_NAME ||= "Admin";
  process.env.LM_STUDIO_API_BASE ||= "http://127.0.0.1:1234/v1";

  const embeddedServer = await startServer(3847) as EmbeddedServer;
  writeRuntimeLog(`Embedded server listening at ${embeddedServer.url}`);
  return embeddedServer;
}

function createWindow(startUrl: string) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: "PEGASUS NEO",
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0a0e1a",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(startUrl);
  writeRuntimeLog(`Renderer loading ${startUrl}`);
}

app.whenReady().then(async () => {
  server = await startEmbeddedServer();
  createWindow(`${server.url}/`);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && server) {
      createWindow(`${server.url}/`);
    }
  });
}).catch(error => {
  writeRuntimeLog("Desktop startup failed", error);
  app.quit();
});

process.on("uncaughtException", error => {
  writeRuntimeLog("Uncaught exception", error);
});

process.on("unhandledRejection", reason => {
  writeRuntimeLog("Unhandled rejection", reason);
});

app.on("before-quit", async () => {
  if (server) {
    await server.close().catch(() => undefined);
    server = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
