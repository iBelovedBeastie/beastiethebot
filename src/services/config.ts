/**
 * Config Service
 * ──────────────
 * Loads and validates configuration from config.json.
 * Auto-generates config.json with defaults if it doesn't exist.
 * Provides runtime access to trigger actions and other settings.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { logger } from "../utils/logger.ts";

interface TriggerConfig {
  channelId: string;
}

interface BotConfig {
  triggers: {
    welcome_msg?: string;
    status?: string;
  };
}

const DEFAULT_CONFIG: BotConfig = {
  triggers: {
    welcome_msg: undefined,
    status: undefined,
  },
};

let config: BotConfig | null = null;

export async function loadConfig(configPath: string): Promise<BotConfig> {
  if (config) return config;

  try {
    if (!existsSync(configPath)) {
      logger.info("config", `Config file not found. Creating ${configPath} with defaults...`);
      
      // Create directory if needed
      const dirPath = configPath.substring(0, configPath.lastIndexOf("/"));
      if (dirPath && !existsSync(dirPath)) {
        await import("node:fs/promises").then(fs => fs.mkdir(dirPath, { recursive: true }));
      }
      
      // Write default config
      await writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
      logger.info("config", `✓ Generated config.json with defaults. Update channel IDs to use triggers.`);
      
      config = DEFAULT_CONFIG;
      return config;
    }

    const data = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(data) as BotConfig;

    // Validate triggers object exists (but allows undefined values)
    if (!parsed.triggers || typeof parsed.triggers !== "object") {
      throw new Error("Config must have a 'triggers' object");
    }

    config = parsed;
    logger.info("config", `Loaded config with triggers: welcome_msg=${config.triggers.welcome_msg ? "✓" : "✗"}, status=${config.triggers.status ? "✓" : "✗"}`);
    return config;
  } catch (err) {
    logger.error("config", `Failed to load config from ${configPath}`, err);
    throw new Error(`Config load failed: ${String(err)}`);
  }
}

export function getConfig(): BotConfig {
  if (!config) {
    throw new Error("Config not loaded. Call loadConfig() first.");
  }
  return config;
}

export function getTrigger(name: "welcome_msg" | "status"): string | undefined {
  return getConfig().triggers[name];
}

export function setTrigger(name: "welcome_msg" | "status", channelId: string | undefined): void {
  const cfg = getConfig();
  cfg.triggers[name] = channelId;
}

export async function saveTrigger(name: "welcome_msg" | "status", channelId: string | undefined, configPath: string): Promise<void> {
  setTrigger(name, channelId);
  await writeFile(configPath, JSON.stringify(getConfig(), null, 2));
  logger.info("config", `Updated trigger: ${name} = ${channelId || "unset"}`);
}

