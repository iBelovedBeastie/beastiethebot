import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import type { CacheType } from "discord.js";
import type { BotCommand, BotClient } from "../types/index.ts";
import { COLORS, diffBlock, relativeTime } from "../utils/embeds.ts";
import { provisionGuild } from "../services/provision.ts";
import { saveTrigger } from "../services/config.ts";
import { logger } from "../utils/logger.ts";
import { env } from "../utils/env.ts";

// ── /ping ─────────────────────────────────────────────────────────────────────
export const ping: BotCommand = {
  data: new SlashCommandBuilder().setName("ping").setDescription("🏓 Bot latency"),
  async execute(i) {
    const sent = await i.reply({ content: "📡 Pinging...", fetchReply: true });
    const roundtrip = sent.createdTimestamp - i.createdTimestamp;
    const ws = i.client.ws.ping;
    await i.editReply({ content: null, embeds: [
      new EmbedBuilder()
        .setTitle("$ ping -c 1 bot.local")
        .setColor(COLORS.cyan)
        .setDescription([
          "```",
          `PING bot.local (127.0.0.1) 56 bytes of data`,
          `64 bytes from bot.local: icmp_seq=1 ttl=64 time=${roundtrip} ms`,
          "",
          `--- bot.local ping statistics ---`,
          `1 packets transmitted, 1 received, 0% packet loss`,
          `rtt min/avg/max = ${roundtrip}/${roundtrip}/${roundtrip} ms`,
          "```",
        ].join("\n"))
        .addFields(
          { name: "🔁 Round-trip", value: `\`${roundtrip}ms\``, inline: true },
          { name: "🔌 WebSocket",  value: `\`${ws}ms\``,        inline: true },
        )
        .setTimestamp(),
    ]});
  },
};

// ── /whoami ───────────────────────────────────────────────────────────────────
export const whoami: BotCommand = {
  data: new SlashCommandBuilder().setName("whoami").setDescription("🔍 Show your uid, groups, and join date"),
  async execute(i) {
    const guild = i.guild!;
    const member = await guild.members.fetch(i.user.id);
    const roles = member.roles.cache
      .filter(r => r.name !== "@everyone")
      .sort((a, b) => b.position - a.position)
      .map(r => `\`${r.name}\``)
      .join(", ") || "`nobody`";

    await i.reply({ flags: MessageFlags.Ephemeral, embeds: [
      new EmbedBuilder()
        .setTitle("$ id && whoami")
        .setColor(COLORS.green)
        .setThumbnail(i.user.displayAvatarURL())
        .setDescription([
          "```sh",
          `uid=${i.user.id}(${i.user.username})`,
          `gid=${guild.id}(${guild.name})`,
          `groups=${member.roles.cache.filter(r=>r.name!=="@everyone").map(r=>r.name).join(",")||"nobody"}`,
          "```",
        ].join("\n"))
        .addFields(
          { name: "👤 Username",    value: i.user.tag,                                                              inline: true },
          { name: "🆔 User ID",     value: `\`${i.user.id}\``,                                                     inline: true },
          { name: "📅 Joined",      value: member.joinedAt ? relativeTime(member.joinedAt) : "unknown",             inline: true },
          { name: "📅 Account Age", value: relativeTime(i.user.createdAt),                                          inline: true },
          { name: "🎭 Roles",       value: roles },
        )
        .setFooter({ text: "$ man id for more info" })
        .setTimestamp(),
    ]});
  },
};

// ── /uname ────────────────────────────────────────────────────────────────────
export const uname: BotCommand = {
  data: new SlashCommandBuilder().setName("uname").setDescription("🖥️ Server info (like uname -a)"),
  async execute(i) {
    const guild = i.guild!;
    const uptime = process.uptime();
    const d = Math.floor(uptime / 86400);
    const h = Math.floor((uptime % 86400) / 3600);
    const m = Math.floor((uptime % 3600)  / 60);

    await i.reply({ embeds: [
      new EmbedBuilder()
        .setTitle("$ uname -a && df -h")
        .setColor(COLORS.yellow)
        .setDescription([
          "```",
          `Linux ${guild.name.toLowerCase().replace(/ /g,"-")} 6.9.0-oss #1 SMP`,
          `arch: x86_64  node: ${process.version}  bun: ${typeof Bun !== "undefined" ? Bun.version : "N/A"}`,
          `uptime: ${d}d ${h}h ${m}m`,
          "```",
        ].join("\n"))
        .addFields(
          { name: "🏠 Hostname",      value: guild.name,                        inline: true },
          { name: "👥 Members",       value: `${guild.memberCount}`,            inline: true },
          { name: "📡 Channels",      value: `${guild.channels.cache.size}`,    inline: true },
          { name: "🎭 Roles",         value: `${guild.roles.cache.size}`,       inline: true },
          { name: "🌍 Guild ID",      value: `\`${guild.id}\``,                 inline: true },
          { name: "📅 Created",       value: relativeTime(guild.createdAt),     inline: true },
          { name: "🤖 Node.js",       value: `\`${process.version}\``,         inline: true },
          { name: "🐇 Bun",           value: `\`${typeof Bun !== "undefined" ? Bun.version : "N/A"}\``,             inline: true },
          { name: "🔌 WS Ping",       value: `\`${i.client.ws.ping}ms\``,      inline: true },
        )
        .setFooter({ text: `${guild.name} — Free as in freedom 🕊️` })
        .setTimestamp(),
    ]});
  },
};

// ── /uptime ───────────────────────────────────────────────────────────────────
export const uptime: BotCommand = {
  data: new SlashCommandBuilder().setName("uptime").setDescription("⏱️ Show bot uptime"),
  async execute(i) {
    const client = i.client as BotClient;
    const ms = Date.now() - client.startedAt.getTime();
    const d  = Math.floor(ms / 86_400_000);
    const h  = Math.floor((ms % 86_400_000) / 3_600_000);
    const m  = Math.floor((ms % 3_600_000)  / 60_000);
    const s  = Math.floor((ms % 60_000)     / 1_000);

    const mem = process.memoryUsage();
    const toMb = (n: number) => (n / 1_048_576).toFixed(1);

    await i.reply({ embeds: [
      new EmbedBuilder()
        .setTitle("$ uptime && free -h")
        .setColor(COLORS.purple)
        .setDescription([
          "```",
          ` uptime: ${d}d ${h}h ${m}m ${s}s`,
          ` load:   0.00, 0.00, 0.00`,
          ` tasks:  1 total, 1 running, 0 sleeping`,
          "```",
        ].join("\n"))
        .addFields(
          { name: "🕐 Uptime",     value: `\`${d}d ${h}h ${m}m ${s}s\``, inline: true },
          { name: "🧠 Heap Used",  value: `\`${toMb(mem.heapUsed)} MB\``, inline: true },
          { name: "🧠 Heap Total", value: `\`${toMb(mem.heapTotal)} MB\``,inline: true },
          { name: "📅 Started",    value: relativeTime(client.startedAt), inline: true },
        )
        .setFooter({ text: "Process never panics." })
        .setTimestamp(),
    ]});
  },
};

// ── /man ──────────────────────────────────────────────────────────────────────
const manPages: Record<string, string> = {
  init:     "**NAME**\n  init — provision the full server\n\n**SYNOPSIS**\n  `/init`\n\n**DESCRIPTION**\n  Deletes all channels, creates fresh Unix-themed structure. One-time use. Requires `root` permissions.",
  whoami:   "**NAME**\n  whoami — print current user identity\n\n**SYNOPSIS**\n  `/whoami`\n\n**DESCRIPTION**\n  Displays your uid, gid, groups, join timestamp, and account age.",
  uname:    "**NAME**\n  uname — print server/kernel info\n\n**SYNOPSIS**\n  `/uname`\n\n**DESCRIPTION**\n  Prints server name, member count, channel count, role count, Node and Bun versions, and WS ping.",
  uptime:   "**NAME**\n  uptime — bot uptime and memory\n\n**SYNOPSIS**\n  `/uptime`\n\n**DESCRIPTION**\n  Shows how long the bot process has been running plus heap memory stats.",
  ping:     "**NAME**\n  ping — measure latency\n\n**SYNOPSIS**\n  `/ping`\n\n**DESCRIPTION**\n  Measures round-trip message latency and WebSocket heartbeat latency.",
  snapshot: "**NAME**\n  snapshot — server state snapshots\n\n**SYNOPSIS**\n  `/snapshot create [label]` | `/snapshot list` | `/snapshot diff <a> <b>`\n\n**DESCRIPTION**\n  Creates a JSON snapshot of all roles and channels. Snapshots can be diffed to see what changed. Like `git stash` for your server.",
  trigger:  "**NAME**\n  trigger — re-send configured messages\n\n**SYNOPSIS**\n  `/trigger <event>`\n\n**DESCRIPTION**\n  Manually triggers a configured event message (welcome_msg or status). Requires admin permissions. Useful for re-posting embeds.",
  setwelcome: "**NAME**\n  setwelcome — configure welcome message channel\n\n**SYNOPSIS**\n  `/setwelcome <channel>`\n\n**DESCRIPTION**\n  Sets the channel where the welcome/MOTD embed will be posted via `/trigger welcome_msg`. Requires admin permissions.",
  setstatus: "**NAME**\n  setstatus — configure status message channel\n\n**SYNOPSIS**\n  `/setstatus <channel>`\n\n**DESCRIPTION**\n  Sets the channel where the status/announcement embed will be posted via `/trigger status`. Requires admin permissions.",
  git:      "**NAME**\n  git — GitHub repo subscriptions\n\n**SYNOPSIS**\n  `/git subscribe <owner/repo>` | `/git unsubscribe <owner/repo>` | `/git list`\n\n**DESCRIPTION**\n  Subscribes to a GitHub repo. Polls every 5 minutes for new commits and releases, posts to #github-feed.",
  fortune:  "**NAME**\n  fortune — print a random UNIX fortune\n\n**SYNOPSIS**\n  `/fortune`\n\n**DESCRIPTION**\n  Prints one of many UNIX-themed fortunes, dev quotes, and kernel wisdom.",
  cowsay:   "**NAME**\n  cowsay — ASCII cow delivers a message\n\n**SYNOPSIS**\n  `/cowsay <message>`\n\n**DESCRIPTION**\n  Generates ASCII art of a cow saying the provided message.",
  hack:     "**NAME**\n  hack — Hollywood-style hacking terminal\n\n**SYNOPSIS**\n  `/hack [target]`\n\n**DESCRIPTION**\n  Simulates an over-the-top hacking sequence. Not an actual exploit.",
  distro:   "**NAME**\n  distro — recommend a Linux distro\n\n**SYNOPSIS**\n  `/distro`\n\n**DESCRIPTION**\n  Answers a few questions about your vibe and recommends a distro.",
  "8ball":  "**NAME**\n  8ball — ask the kernel oracle\n\n**SYNOPSIS**\n  `/8ball <question>`\n\n**DESCRIPTION**\n  The kernel oracle answers your question. Output is non-deterministic.",
};

export const man: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("man")
    .setDescription("📖 Read the manual page for a command")
    .addStringOption(o => o
      .setName("command")
      .setDescription("Command to look up")
      .setRequired(true)
      .addChoices(
        ...Object.keys(manPages).map(k => ({ name: k, value: k }))
      )
    ) as SlashCommandBuilder,
  async execute(i) {
    const cmd = i.options.getString("command", true);
    const page = manPages[cmd] ?? "No manual entry for that command.";
    await i.reply({ flags: MessageFlags.Ephemeral, embeds: [
      new EmbedBuilder()
        .setTitle(`$ man ${cmd}`)
        .setColor(COLORS.blue)
        .setDescription(page)
        .setFooter({ text: "Manual page — q to quit" }),
    ]});
  },
};

// ── /init ─────────────────────────────────────────────────────────────────────
//
// Rules:
//   1. Only the server owner (guild.ownerId) may ever run this command.
//      No exceptions — not admins, not root role holders.
//   2. First run: proceeds immediately after owner check.
//   3. Re-run (server already initialized): owner must confirm via a
//      button prompt. The confirmation expires after 30 seconds.
//      This prevents accidental re-provisioning (which wipes all channels).

export const init: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("init")
    .setDescription("⚙️ Initialize the Unix-themed server (server owner only)"),

  async execute(i: ChatInputCommandInteraction<CacheType>) {
    if (!i.guildId || !i.guild) {
      await i.reply({ content: "❌ Server-only command.", flags: MessageFlags.Ephemeral });
      return;
    }

    // ── Guard 1: server owner only ───────────────────────────────────────────
    if (i.user.id !== i.guild.ownerId) {
      await i.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("$ sudo /init")
          .setDescription([
            "```diff",
            "- sudo: /init: permission denied",
            "- This command requires UID 0 (server owner).",
            "```",
            `> Only <@${i.guild.ownerId}> can run this command.`,
          ].join("\n"))
          .setFooter({ text: "kernel: operation not permitted (EPERM)" }),
        ],
      });
      return;
    }

    const alreadyInit = i.guild.roles.cache.some(r => r.name === "root");

    // ── First-time run ────────────────────────────────────────────────────────
    if (!alreadyInit) {
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      
      try {
        await i.editReply({
          content: diffBlock([
            "[  0.000] Booting kernel...",
            "[  0.021] Mounting /proc",
            "[  0.042] Provisioning filesystem...",
          ]),
        }).catch(() => {}); // Ignore if token expired

        await provisionGuild(i.guild);
        
        // FIXED: Don't overwrite with undefined! provisionGuild already sets the correct IDs
        // The config is saved inside provisionGuild via phase 4
        
        await i.editReply({ 
          content: diffBlock([
            "+ [  OK  ] Roles created",
            "+ [  OK  ] Channels provisioned",
            "+ [  OK  ] Embeds posted",
            "+ [  OK  ] Reaction roles active",
            "",
            "$ systemctl status server",
            "● server.service — OSS Community",
            "   Active: active (running)",
          ])
        }).catch(() => {
          // If token expired, send DM to user
          i.user.send({
            content: diffBlock([
              "+ [  OK  ] Roles created",
              "+ [  OK  ] Channels provisioned",
              "+ [  OK  ] Embeds posted",
              "+ [  OK  ] Reaction roles active",
              "",
              "$ systemctl status server",
              "● server.service — OSS Community",
              "   Active: active (running)",
            ]),
          }).catch(() => {
            logger.warn("provision", "Could not DM user provision result");
          });
        });
      } catch (err) {
        logger.error("provision", "provisionGuild failed", err);
        await i.editReply({ 
          content: `❌ Kernel panic! Check logs.\n\`\`\`${String(err).slice(0, 200)}\`\`\`` 
        }).catch(() => {
          i.user.send({
            content: `❌ Kernel panic! Check logs.\n\`\`\`${String(err).slice(0, 200)}\`\`\``,
          }).catch(() => {
            logger.error("provision", "Could not DM user error result");
          });
        });
      }
      return;
    }

    // ── Re-init: owner must confirm ───────────────────────────────────────────
    // Server is already initialized. Show a warning with Confirm / Abort buttons.
    // Only the owner's click is accepted. Times out after 30 s.
    const confirmBtn = new ButtonBuilder()
      .setCustomId("init_confirm")
      .setLabel("Re-initialize (wipes everything)")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("⚠️");

    const abortBtn = new ButtonBuilder()
      .setCustomId("init_abort")
      .setLabel("Abort")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🛑");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmBtn, abortBtn);

    await i.reply({
      flags: MessageFlags.Ephemeral,
      components: [row],
      embeds: [new EmbedBuilder()
        .setColor("#FF8C00")
        .setTitle("⚠️  Server Already Initialized")
        .setDescription([
          "```diff",
          "- WARNING: /init has already been run on this server.",
          "- Re-running will WIPE ALL channels and roles.",
          "- This cannot be undone.",
          "```",
          "",
          "**Run `/snapshot create` first if you want a backup.**",
          "",
          "Confirm only if you intend a full re-provision.",
          "*This prompt expires in 30 seconds.*",
        ].join("\n"))
        .setFooter({ text: "kernel: awaiting owner confirmation — EPERM unless confirmed" }),
      ],
    });

    // Collect button interaction — owner only, 30 s window
    const collector = i.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (btn) => btn.user.id === i.guild!.ownerId &&
                       ["init_confirm", "init_abort"].includes(btn.customId),
      max: 1,
      time: 30_000,
    });

    if (!collector) return;

    collector.on("collect", async (btn) => {
      if (btn.customId === "init_abort") {
        await btn.update({
          components: [],
          embeds: [new EmbedBuilder()
            .setColor("#808080")
            .setTitle("🛑 Aborted")
            .setDescription("```\n$ ^C\nAborted by owner. No changes made.\n```"),
          ],
        });
        return;
      }

      // Confirmed — wipe and re-provision
      await btn.update({
        components: [],
        content: diffBlock([
          "[  0.000] Re-initializing on owner authority...",
          "[  0.021] Purging existing filesystem...",
          "[  0.042] Reprovisioning...",
        ]),
        embeds: [],
      });

      try {
        await provisionGuild(i.guild!);
        
        // FIXED: Don't overwrite with undefined! provisionGuild already sets the correct IDs
        
        await btn.user.send({ content: diffBlock([
          "+ [  OK  ] Re-provision complete",
          "+ [  OK  ] All roles recreated",
          "+ [  OK  ] All channels remounted",
          "",
          "$ systemctl restart server",
          "● server.service — OSS Community",
          "   Active: active (running)",
        ])}).catch(() => {
          logger.warn("provision", "Could not DM user re-provision result");
        });
      } catch (err) {
        logger.error("provision", "Re-provision failed", err);
        await btn.user.send({ 
          content: `❌ Kernel panic during re-provision.\n\`\`\`${String(err).slice(0, 200)}\`\`\`` 
        }).catch(() => {
          logger.error("provision", "Could not DM user error result");
        });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        // Timed out — disable the buttons
        await i.editReply({
          components: [],
          embeds: [new EmbedBuilder()
            .setColor("#808080")
            .setTitle("⏱️ Confirmation Timed Out")
            .setDescription("```\nNo response received in 30s.\nOperation aborted. No changes made.\n```"),
          ],
        }).catch(() => {});
      }
    });
  },
};

