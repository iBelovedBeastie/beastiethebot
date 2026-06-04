import { Events } from "discord.js";
import type { Interaction } from "discord.js";
import { MessageFlags } from "discord.js";
import type { BotClient } from "../types/index.ts";
import { logger } from "../utils/logger.ts";
import { errorEmbed } from "../utils/embeds.ts";
import { env } from "../utils/env.ts"; // FIXED: Import at top level instead of dynamic import

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // FIXED: Handle autocomplete for /trigger so Discord doesn't throw an error
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === "trigger") {
        const focused = interaction.options.getFocused();
        const choices = ["welcome_msg", "status"];
        const filtered = choices.filter(c => c.startsWith(focused));
        await interaction.respond(filtered.map(c => ({ name: c, value: c }))).catch(() => {});
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    // ── Guild authorization ───────────────────────────────────────────────────
    if (interaction.guildId !== env.GUILD_ID) { // FIXED: Use imported env instead of await import()
      logger.warn("interaction", `Unauthorized guild attempt: ${interaction.guildId}`);
      await interaction.reply({
        content: "❌ This bot is exclusive to one server and cannot be used here.",
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
      return;
    }

    const client   = interaction.client as BotClient;
    const command  = client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn("interaction", `Unknown command: ${interaction.commandName}`);
      await interaction.reply({
        embeds: [errorEmbed("Unknown Command", `\`/${interaction.commandName}\` not found.\nRun \`/man\` to see available commands.`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      logger.info("interaction", `/${interaction.commandName} by ${interaction.user.tag}`);
      await command.execute(interaction);
    } catch (err) {
      logger.error("interaction", `Error in /${interaction.commandName}`, err);
      const reply = {
        embeds: [errorEmbed("Runtime Error", `\`\`\`\nSegmentation fault (core dumped)\n\`\`\`\nAn internal error occurred. Please try again or contact support.`)],
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply).catch(() => {});
      } else {
        await interaction.reply({ ...reply, flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  },
};
