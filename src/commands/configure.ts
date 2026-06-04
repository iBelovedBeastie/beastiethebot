/**
 * Configuration Commands
 * ──────────────────────
 * /setwelcome and /setstatus to configure trigger channels.
 * Requires admin role.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  ChannelType,
} from "discord.js";
import type { CacheType } from "discord.js";
import type { BotCommand } from "../types/index.ts";
import { COLORS } from "../utils/embeds.ts";
import { isAdmin } from "../utils/permissions.ts";
import { saveTrigger, getTrigger } from "../services/config.ts";
import { logger } from "../utils/logger.ts";
import { env } from "../utils/env.ts";

// ── /setwelcome ───────────────────────────────────────────────────────────────
export const setwelcome: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("📜 Set the welcome message channel (admin only)")
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("Target channel for welcome messages")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(i: ChatInputCommandInteraction<CacheType>) {
    // ── Permission check ──────────────────────────────────────────────────────
    if (!isAdmin(i.member as any)) {
      await i.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.red)
          .setTitle("$ /setwelcome")
          .setDescription("```\n-bash: /setwelcome: permission denied\n```\n> This command is restricted to administrators.")
          .setFooter({ text: "kernel: permission denied (EPERM)" })
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = i.options.getChannel("channel", true);

    try {
      await saveTrigger("welcome_msg", channel.id, env.CONFIG_FILE);
      
      logger.info("config", `${i.user.tag} set welcome_msg → #${channel.name}`);

      await i.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.green)
          .setTitle("✅ Welcome Channel Updated")
          .setDescription(`Welcome messages will now post to <#${channel.id}>`)
          .addFields({
            name: "Channel",
            value: `**${channel.name}** (\`${channel.id}\`)`,
            inline: false,
          })
        ],
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      logger.error("config", `Failed to set welcome_msg`, err);
      await i.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.red)
          .setTitle("❌ Configuration Failed")
          .setDescription(`\`\`\`\n${String(err).slice(0, 100)}\n\`\`\``)
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

// ── /setstatus ────────────────────────────────────────────────────────────────
export const setstatus: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("setstatus")
    .setDescription("📊 Set the status message channel (admin only)")
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("Target channel for status messages")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(i: ChatInputCommandInteraction<CacheType>) {
    // ── Permission check ──────────────────────────────────────────────────────
    if (!isAdmin(i.member as any)) {
      await i.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.red)
          .setTitle("$ /setstatus")
          .setDescription("```\n-bash: /setstatus: permission denied\n```\n> This command is restricted to administrators.")
          .setFooter({ text: "kernel: permission denied (EPERM)" })
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = i.options.getChannel("channel", true);

    try {
      await saveTrigger("status", channel.id, env.CONFIG_FILE);
      
      logger.info("config", `${i.user.tag} set status → #${channel.name}`);

      await i.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.green)
          .setTitle("✅ Status Channel Updated")
          .setDescription(`Status messages will now post to <#${channel.id}>`)
          .addFields({
            name: "Channel",
            value: `**${channel.name}** (\`${channel.id}\`)`,
            inline: false,
          })
        ],
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      logger.error("config", `Failed to set status`, err);
      await i.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.red)
          .setTitle("❌ Configuration Failed")
          .setDescription(`\`\`\`\n${String(err).slice(0, 100)}\n\`\`\``)
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
