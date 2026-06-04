/**
 * /trigger Command
 * ────────────────
 * Dev/admin utility to send configured trigger messages to channels.
 * Requires admin role.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import type { CacheType } from "discord.js";
import type { BotCommand } from "../types/index.ts";
import { COLORS } from "../utils/embeds.ts";
import { isAdmin } from "../utils/permissions.ts";
import { getTrigger } from "../services/config.ts";
import { logger } from "../utils/logger.ts";
import { postMotd, postAnnouncement } from "../services/provision.ts";

export const trigger: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("trigger")
    .setDescription("🎬 Trigger configured messages (admin only)")
    .addStringOption(o =>
      o.setName("event")
        .setDescription("Which event to trigger")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async execute(i: ChatInputCommandInteraction<CacheType>) {
    // ── Permission check ──────────────────────────────────────────────────────
    if (!isAdmin(i.member as any)) {
      await i.reply({
        embeds: [new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("$ /trigger")
          .setDescription("```\n-bash: /trigger: permission denied\n```\n> This command is restricted to administrators.")
          .setFooter({ text: "kernel: permission denied (EPERM)" })
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // ── Get event ─────────────────────────────────────────────────────────────
    const eventName = i.options.getString("event", true);
    
    // Validate event is valid
    if (eventName !== "welcome_msg" && eventName !== "status") {
      await i.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.red)
          .setTitle("❌ Unknown Event")
          .setDescription(`\`${eventName}\` is not a valid trigger.\n\n**Valid triggers:**\n\`\`\`\nwelcome_msg\nstatus\n\`\`\``)
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channelId = getTrigger(eventName);

    if (!channelId) {
      await i.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.red)
          .setTitle("❌ Trigger Not Configured")
          .setDescription(`The \`${eventName}\` trigger is not configured yet.\n\nUse \`/set${eventName}\` to configure it.`)
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // ── Find target channel ───────────────────────────────────────────────────
    if (!i.guild) {
      await i.reply({
        content: "❌ This command only works in servers.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetChannel = i.guild.channels.cache.get(channelId);

    if (!targetChannel) {
      await i.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.red)
          .setTitle("❌ Target Channel Not Found")
          .setDescription(`The configured channel with ID \`${channelId}\` no longer exists.\n\nReconfigure using \`/set${eventName}\`.`)
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // ── Execute trigger ──────────────────────────────────────────────────────
    try {
      await i.deferReply({ flags: MessageFlags.Ephemeral });

      switch (eventName) {
        case "welcome_msg":
          await postMotd(targetChannel as any);
          break;
        case "status":
          await postAnnouncement(targetChannel as any);
          break;
        default:
          throw new Error(`Unhandled trigger: ${eventName}`);
      }

      logger.info("trigger", `${i.user.tag} triggered ${eventName} → #${targetChannel.name}`);

      await i.editReply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.green)
          .setTitle("✅ Trigger Executed")
          .setDescription(`Sent **${eventName}** to <#${targetChannel.id}>`)
        ],
      });
    } catch (err) {
      logger.error("trigger", `Failed to execute trigger ${eventName}`, err);
      await i.editReply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.red)
          .setTitle("❌ Execution Failed")
          .setDescription(`\`\`\`\n${String(err).slice(0, 100)}\n\`\`\``)
        ],
      });
    }
  },
};
