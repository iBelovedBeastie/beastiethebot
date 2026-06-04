/**
 * OSS Community Bot
 * ─────────────────
 * Entry point. Loads env, creates client, registers commands + events.
 *
 * Run:   bun run src/index.ts
 * Dev:   bun run --watch src/index.ts
 */

import "./utils/env.ts"; // validates env first — exits if invalid
import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import type { BotClient, BotCommand } from "./types/index.ts";
import { env } from "./utils/env.ts";
import { logger } from "./utils/logger.ts";

// ── Commands ──────────────────────────────────────────────────────────────────
import { ping, whoami, uname, uptime, man, init } from "./commands/system.ts";
import { snapshot } from "./commands/snapshots.ts";
import { trigger } from "./commands/trigger.ts";
import { setwelcome, setstatus } from "./commands/configure.ts";
import { git } from "./commands/github.ts";
import { fortune, cowsayCmd, hack, distro, eightball } from "./commands/fun.ts";

// ── Events ────────────────────────────────────────────────────────────────────
import readyEvent          from "./events/ready.ts";
import interactionEvent    from "./events/interactionCreate.ts";
import memberAddEvent      from "./events/guildMemberAdd.ts";
import memberRemoveEvent   from "./events/guildMemberRemove.ts";
import reactionAddEvent    from "./events/MessageReactionAdd.ts";
import reactionRemoveEvent from "./events/MessageReactionRemove.ts";

// ── Client setup ──────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
}) as BotClient;

client.commands  = new Collection<string, BotCommand>();
client.startedAt = new Date();

// ── Register commands ─────────────────────────────────────────────────────────
const commands: BotCommand[] = [
  ping, whoami, uname, uptime, man, init,
  snapshot,
  trigger,
  setwelcome, setstatus,
  git,
  fortune, cowsayCmd, hack, distro, eightball,
];

for (const cmd of commands) {
  client.commands.set(cmd.data.name, cmd);
}

// ── Register events ───────────────────────────────────────────────────────────
type EventModule = { name: string; once?: boolean; execute: (...args: unknown[]) => Promise<void> | void };

const events: EventModule[] = [
  readyEvent as EventModule,
  interactionEvent as EventModule,
  memberAddEvent as EventModule,
  memberRemoveEvent as EventModule,
  reactionAddEvent as EventModule,
  reactionRemoveEvent as EventModule,
];

for (const event of events) {
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on("SIGINT",  () => { logger.info("process", "SIGINT received — shutting down"); client.destroy(); process.exit(0); });
process.on("SIGTERM", () => { logger.info("process", "SIGTERM received — shutting down"); client.destroy(); process.exit(0); });

process.on("unhandledRejection", (reason) => {
  logger.error("process", "Unhandled rejection", reason);
});

process.on("uncaughtException", (err) => {
  logger.error("process", "Uncaught exception", err);
  // Don't exit — let Railway restart if truly broken
});

// ── Config loading ────────────────────────────────────────────────────────────
import { loadConfig } from "./services/config.ts";

logger.info("startup", "Loading config...");
try {
  await loadConfig(env.CONFIG_FILE);
} catch (err) {
  logger.error("startup", "Failed to load config — using defaults", err);
}

// ── Login ─────────────────────────────────────────────────────────────────────
logger.info("startup", "Connecting to Discord...");
await client.login(env.DISCORD_TOKEN);
