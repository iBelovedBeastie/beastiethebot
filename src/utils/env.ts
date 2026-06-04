import { z } from "zod";

const schema = z.object({
  DISCORD_TOKEN:        z.string().min(1, "DISCORD_TOKEN is required"),
  GUILD_ID:             z.string().min(1, "GUILD_ID is required"),
  CLIENT_ID:            z.string().min(1, "CLIENT_ID is required"),
  GITHUB_REPOS:         z.string().default(""),
  GITHUB_TOKEN:         z.string().default(""),
  SNAPSHOT_DIR:         z.string().default("./snapshots"),
  SNAPSHOT_MAX:         z.coerce.number().default(20),
  WELCOME_IMAGE_URL:    z.string().default(""),
  LOG_LEVEL:            z.enum(["debug", "info", "warn", "error"]).default("info"),
  GITHUB_FEED_CHANNEL:  z.string().default("📡│github-feed"),
  JOIN_LOG_CHANNEL:     z.string().default("📋│var-log-syslog"),
  CONFIG_FILE:          z.string().default("./config.json"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
