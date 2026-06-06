import fs from "fs";
import os from "os";
import path from "path";

export type DesktopConfig = {
  apiBaseUrl: string;
  apiKey: string;
};

export const LM_STUDIO_API_BASE = "http://127.0.0.1:1234/v1";

const DEFAULT_CONFIG: DesktopConfig = {
  apiBaseUrl: LM_STUDIO_API_BASE,
  apiKey: "lm-studio",
};

const appSupportDir = () =>
  process.env.PEGASUS_APP_SUPPORT_DIR ||
  path.join(os.homedir(), "Library", "Application Support", "PegasusNEO");

export const getDesktopConfigPath = () =>
  process.env.PEGASUS_CONFIG_PATH || path.join(appSupportDir(), "config.json");

export function readDesktopConfig(): DesktopConfig {
  const configPath = getDesktopConfigPath();
  if (!fs.existsSync(configPath)) return { ...DEFAULT_CONFIG };

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Partial<DesktopConfig>;
    return {
      apiBaseUrl: LM_STUDIO_API_BASE,
      apiKey: parsed.apiKey?.trim() || DEFAULT_CONFIG.apiKey,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeDesktopConfig(config: DesktopConfig): DesktopConfig {
  const normalized = {
    apiBaseUrl: LM_STUDIO_API_BASE,
    apiKey: config.apiKey?.trim() || DEFAULT_CONFIG.apiKey,
  };
  const configPath = getDesktopConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return normalized;
}

export function hasDesktopApiKey() {
  return readDesktopConfig().apiKey.length > 0;
}
