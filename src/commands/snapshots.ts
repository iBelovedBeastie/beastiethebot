import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import type { BotCommand } from "../types/index.ts";
import { COLORS, diffBlock } from "../utils/embeds.ts";
import {
  createSnapshot,
  listSnapshots,
  diffSnapshots,
} from "../services/snapshots.ts";

export const snapshot: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("snapshot")
    .setDescription("📸 Git-like server state snapshots")
    .addSubcommand(s =>
      s.setName("create")
        .setDescription("Save current server state as a snapshot")
        .addStringOption(o =>
          o.setName("label").setDescription("Short description (e.g. 'before big refactor')").setRequired(false)
        )
    )
    .addSubcommand(s =>
      s.setName("list")
        .setDescription("List all saved snapshots")
    )
    .addSubcommand(s =>
      s.setName("diff")
        .setDescription("Diff two snapshots to see what changed")
        .addStringOption(o =>
          o.setName("from").setDescription("Older snapshot ID").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("to").setDescription("Newer snapshot ID").setRequired(true)
        )
    ) as SlashCommandBuilder,

  async execute(i: ChatInputCommandInteraction) {
    const sub = i.options.getSubcommand(true);

    // ── create ──────────────────────────────────────────────────────────────
    if (sub === "create") {
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const label = i.options.getString("label") ?? "no label";
      try {
        const meta = await createSnapshot(i.guild!, i.user.tag, label);
        await i.editReply({ embeds: [
          new EmbedBuilder()
            .setTitle("📸 Snapshot Created")
            .setColor(COLORS.green)
            .setDescription(diffBlock([
              `+ id:       ${meta.id}`,
              `+ label:    ${meta.label}`,
              `+ roles:    ${meta.roleCount}`,
              `+ channels: ${meta.channelCount}`,
              `+ by:       ${meta.createdBy}`,
              `+ at:       ${meta.createdAt}`,
            ]))
            .setFooter({ text: "Use /snapshot diff to compare two snapshots" }),
        ]});
      } catch (err) {
        await i.editReply({ content: `❌ Snapshot failed: \`${String(err)}\`` });
      }
      return;
    }

    // ── list ────────────────────────────────────────────────────────────────
    if (sub === "list") {
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const snaps = await listSnapshots();
      if (snaps.length === 0) {
        await i.editReply({ content: "No snapshots yet. Run `/snapshot create` first." });
        return;
      }

      const lines = snaps.map((s: any, idx: number) =>
        `${String(idx + 1).padStart(2, " ")}. \`${s.id}\`  ${s.label.slice(0, 30).padEnd(30, " ")}  ${s.roleCount}r ${s.channelCount}ch  by ${s.createdBy}`
      );

      await i.editReply({ embeds: [
        new EmbedBuilder()
          .setTitle(`📋 Snapshots (${snaps.length})`)
          .setColor(COLORS.blue)
          .setDescription("```\n" + lines.join("\n") + "\n```")
          .setFooter({ text: "Use /snapshot diff <from> <to> to compare" }),
      ]});
      return;
    }

    // ── diff ────────────────────────────────────────────────────────────────
    if (sub === "diff") {
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const fromId = i.options.getString("from", true);
      const toId   = i.options.getString("to", true);

      try {
        const { added, removed, changed } = await diffSnapshots(fromId, toId);

        const addedLines   = added.map((n: any) => `+ ${n}`);
        const removedLines = removed.map((n: any) => `- ${n}`);
        const changedLines = changed.map((n: any) => `~ ${n}`);

        const body =
          addedLines.length + removedLines.length + changedLines.length === 0
            ? ["  (no channel differences found)"]
            : [...removedLines, ...changedLines, ...addedLines];

        await i.editReply({ embeds: [
          new EmbedBuilder()
            .setTitle(`📊 Snapshot Diff: ${fromId.slice(-10)} → ${toId.slice(-10)}`)
            .setColor(COLORS.orange)
            .setDescription(diffBlock(body))
            .addFields(
              { name: "➕ Added",   value: `${added.length} channels`,   inline: true },
              { name: "➖ Removed", value: `${removed.length} channels`, inline: true },
              { name: "✏️ Changed", value: `${changed.length} channels`, inline: true },
            )
            .setFooter({ text: "diff channels only — roles diff coming soon" }),
        ]});
      } catch (err) {
        await i.editReply({ content: `❌ Diff failed: \`${String(err)}\`` });
      }
      return;
    }
  },
};
