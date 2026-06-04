/**
 * guildMemberAdd event
 * ─────────────────────
 * 1. Posts a syslog-style entry to #var-log-syslog
 * 2. Sends the new member a DM welcome with instructions
 * 3. Optionally posts a visual welcome embed to #home-lounge
 */

import {
  Events,
  GuildMember,
  EmbedBuilder,
  type TextChannel,
} from "discord.js";
import { env } from "../utils/env.ts";
import { logger } from "../utils/logger.ts";
import { COLORS } from "../utils/embeds.ts";

// ── Welcome ASCII banners (one is picked at random) ───────────────────────────
const BANNERS = [
  [
    " _   _      _ _",
    "| | | | ___| | | ___",
    "| |_| |/ _ \\ | |/ _ \\",
    "|  _  |  __/ | | (_) |",
    "|_| |_|\\___|_|_|\\___/",
    "",
    "  new process spawned",
  ],
  [
    "██╗    ██╗███████╗██╗      ██████╗",
    "██║    ██║██╔════╝██║     ██╔════╝",
    "██║ █╗ ██║█████╗  ██║     ██║",
    "██║███╗██║██╔══╝  ██║     ██║",
    "╚███╔███╔╝███████╗███████╗╚██████╗",
    " ╚══╝╚══╝ ╚══════╝╚══════╝ ╚═════╝",
  ],
  [
    "  ___  ___ ___",
    " / _ \\/ __/ __|",
    "| (_) \\__ \\__ \\",
    " \\___/|___/___/",
    "",
    "  open source society",
  ],
];

function randomBanner(): string {
  const b = BANNERS[Math.floor(Math.random() * BANNERS.length)]!;
  return b.join("\n");
}

// ── Syslog line ───────────────────────────────────────────────────────────────
function syslogLine(member: GuildMember): string {
  const ts     = new Date().toISOString().replace("T", " ").slice(0, 19);
  const uid    = member.user.id;
  const uname  = member.user.username;
  const joined = member.guild.memberCount;

  return [
    "```",
    `${ts} kernel: new process spawned`,
    `  uid=${uid}(${uname})`,
    `  gid=${member.guild.id}(${member.guild.name})`,
    `  total_members=${joined}`,
    `  action=JOIN`,
    `  status=unauthenticated`,
    `  next_step=/login`,
    "```",
  ].join("\n");
}

// ── Welcome embed (lounge) ────────────────────────────────────────────────────
function welcomeEmbed(member: GuildMember): EmbedBuilder {
  const banner = randomBanner();
  const memberNum = member.guild.memberCount;

  return new EmbedBuilder()
    .setColor(COLORS.green)
    .setTitle("🖥️ New Process Spawned")
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setDescription([
      "```",
      banner,
      "```",
      "",
      `**${member.user.tag}** joined the server.`,
      `> You are member **#${memberNum}**.`,
    ].join("\n"))
    .addFields(
      { name: "📜 Step 1 — Read the rules", value: "`#etc-motd`",    inline: true },
      { name: "✅ Step 2 — Verify",         value: "`#login`",       inline: true },
      { name: "🎯 Step 3 — Pick roles",     value: "`#etc-groups`",  inline: true },
    )
    .setFooter({ text: `${member.guild.name} — Free as in freedom 🕊️` })
    .setTimestamp();
}

// ── DM welcome ────────────────────────────────────────────────────────────────
function dmEmbed(member: GuildMember): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.blue)
    .setTitle(`👋 Welcome to ${member.guild.name}`)
    .setDescription([
      "```diff",
      "+ You have been granted guest access.",
      "+ Complete the steps below to become a full member.",
      "```",
    ].join("\n"))
    .addFields(
      { name: "1️⃣  Read the rules",  value: `Go to **#etc-motd** in the server.`  },
      { name: "2️⃣  Verify yourself", value: `React ✅ in **#login** to get the \`user\` role.` },
      { name: "3️⃣  Pick your roles", value: `Choose distro, editor, shell in **#etc-groups**.` },
      { name: "💬  Start chatting",   value: `Introduce yourself in **#home-introductions**!`   },
    )
    .setFooter({ text: "Free as in freedom 🕊️" })
    .setTimestamp();
}

// ── Event handler ─────────────────────────────────────────────────────────────
export default {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    logger.info("join", `${member.user.tag} joined ${member.guild.name}`);

    // FIXED: Automatically assign 'nobody' role so they can see channels
    const nobodyRole = member.guild.roles.cache.find(r => r.name === "nobody");
    if (nobodyRole && !member.roles.cache.has(nobodyRole.id)) {
      await member.roles.add(nobodyRole, "Auto-assigned on join").catch(() => {});
    }

    // 1. Syslog channel
    const logChannel = member.guild.channels.cache.find(
      c => c.name === env.JOIN_LOG_CHANNEL
    ) as TextChannel | undefined;

    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(COLORS.cyan)
        .setAuthor({
          name:    `${member.user.tag} — UID ${member.user.id}`,
          iconURL: member.user.displayAvatarURL(),
        })
        .setDescription(syslogLine(member))
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed] }).catch(err =>
        logger.error("join", "Failed to post syslog entry", err)
      );
    }

    // FIXED: Removed #home-lounge welcome since #login is the welcome channel

    // 2. DM the new member
    await member.send({ embeds: [dmEmbed(member)] }).catch(() => {
      // DMs may be disabled — silent fail is correct
      logger.debug("join", `DMs closed for ${member.user.tag} — skipping`);
    });
  },
};
