import { Events, type Client, REST, Routes, ActivityType } from "discord.js";
import type { BotClient } from "../types/index.ts";
import { env } from "../utils/env.ts";
import { logger } from "../utils/logger.ts";
import { startGitHubPoller, seedReposFromEnv } from "../services/github.ts";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    const bot = client as BotClient;
    logger.info("ready", `Logged in as ${bot.user!.tag}`);
    logger.info("ready", `Guild: ${env.GUILD_ID}`);
    logger.info("ready", `Commands loaded: ${bot.commands.size}`);

    // ── Register slash commands ────────────────────────────────────────────────
    const rest     = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
    const cmdBodies = [...bot.commands.values()].map(c => c.data.toJSON());

    try {
      await rest.put(
        Routes.applicationGuildCommands(bot.user!.id, env.GUILD_ID),
        { body: cmdBodies }
      );
      logger.info("ready", `Registered ${cmdBodies.length} slash commands`);
    } catch (err) {
      logger.error("ready", "Failed to register slash commands", err);
    }

    // ── Seed GitHub repos from env & start poller ─────────────────────────────
    await seedReposFromEnv();
    await startGitHubPoller(client);

    // ── Presence ──────────────────────────────────────────────────────────────
    bot.user!.setActivity("$ man bot", { type: ActivityType.Watching });

    logger.info("ready", "Bot fully initialized ✓");
    console.log([
      "",
      "╔══════════════════════════════════════════╗",
      "║         OSS Community Bot — ONLINE       ║",
      `║  Tag:      ${bot.user!.tag.padEnd(30)}║`,
      `║  Guild:    ${env.GUILD_ID.padEnd(30)}║`,
      `║  Commands: ${String(bot.commands.size).padEnd(30)}║`,
      "╚══════════════════════════════════════════╝",
      "",
    ].join("\n"));
  },
};
