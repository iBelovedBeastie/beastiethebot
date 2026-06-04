import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import type { BotCommand } from "../types/index.ts";
import { COLORS, diffBlock, relativeTime } from "../utils/embeds.ts";
import {
  subscribeRepo,
  unsubscribeRepo,
  listSubscriptions,
} from "../services/github.ts";

export const git: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("git")
    .setDescription("🐙 GitHub repo subscriptions")
    .addSubcommand(s =>
      s.setName("subscribe")
        .setDescription("Subscribe to a GitHub repo for updates in #github-feed")
        .addStringOption(o =>
          o.setName("repo")
            .setDescription("owner/repo — e.g. torvalds/linux")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("unsubscribe")
        .setDescription("Unsubscribe from a GitHub repo")
        .addStringOption(o =>
          o.setName("repo")
            .setDescription("owner/repo — e.g. torvalds/linux")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("list")
        .setDescription("List all subscribed repos")
    ) as SlashCommandBuilder,

  async execute(i: ChatInputCommandInteraction) {
    const sub = i.options.getSubcommand(true);

    // ── subscribe ────────────────────────────────────────────────────────────
    if (sub === "subscribe") {
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const repoArg = i.options.getString("repo", true).trim();

      try {
        const fullName = await subscribeRepo(repoArg);
        await i.editReply({ embeds: [
          new EmbedBuilder()
            .setTitle("🐙 Subscribed")
            .setColor(COLORS.green)
            .setDescription(diffBlock([
              `+ repo:    ${fullName}`,
              `+ feed:    #github-feed`,
              `+ polling: every 5 minutes`,
              `+ events:  commits, releases`,
            ]))
            .addFields({
              name: "🔗 View on GitHub",
              value: `[github.com/${fullName}](https://github.com/${fullName})`,
            })
            .setFooter({ text: "First update fires on next poll cycle" }),
        ]});
      } catch (err) {
        await i.editReply({ embeds: [
          new EmbedBuilder()
            .setTitle("❌ Subscribe Failed")
            .setColor(COLORS.red)
            .setDescription(`\`\`\`\n${String(err)}\n\`\`\``)
            .setFooter({ text: "Ensure the format is owner/repo and the repo is public" }),
        ]});
      }
      return;
    }

    // ── unsubscribe ──────────────────────────────────────────────────────────
    if (sub === "unsubscribe") {
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const repoArg = i.options.getString("repo", true).trim();

      try {
        await unsubscribeRepo(repoArg);
        await i.editReply({ embeds: [
          new EmbedBuilder()
            .setTitle("🗑️ Unsubscribed")
            .setColor(COLORS.gray)
            .setDescription(diffBlock([`- ${repoArg} removed from feed`]))
            .setFooter({ text: "Polling stopped for this repo" }),
        ]});
      } catch (err) {
        await i.editReply({ content: `❌ \`${String(err)}\`` });
      }
      return;
    }

    // ── list ─────────────────────────────────────────────────────────────────
    if (sub === "list") {
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const repos = await listSubscriptions();

      if (repos.length === 0) {
        await i.editReply({ content: "No repos subscribed yet. Use `/git subscribe owner/repo`." });
        return;
      }

      const fields = repos.map(r => ({
        name:   `📦 ${r.owner}/${r.repo}`,
        value:  [
          `Last SHA: \`${r.lastCheckedSha?.slice(0, 7) ?? "none"}\``,
          `Checked: ${r.lastCheckedAt ? relativeTime(new Date(r.lastCheckedAt)) : "never"}`,
          `[View →](https://github.com/${r.owner}/${r.repo})`,
        ].join("  |  "),
        inline: false,
      }));

      await i.editReply({ embeds: [
        new EmbedBuilder()
          .setTitle(`🐙 Subscribed Repos (${repos.length})`)
          .setColor(COLORS.github)
          .addFields(fields)
          .setFooter({ text: "Polling every 5 minutes — commits + releases" })
          .setTimestamp(),
      ]});
      return;
    }
  },
};
