import { Events, GuildMember, EmbedBuilder, type TextChannel, type PartialGuildMember } from "discord.js";
import { env } from "../utils/env.ts";
import { logger } from "../utils/logger.ts";
import { COLORS } from "../utils/embeds.ts";

export default {
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember | PartialGuildMember) {
    logger.info("leave", `${member.user?.tag ?? member.id} left ${member.guild.name}`);

    const logChannel = member.guild.channels.cache.find(
      c => c.name === env.JOIN_LOG_CHANNEL
    ) as TextChannel | undefined;

    if (!logChannel) return;

    const ts     = new Date().toISOString().replace("T", " ").slice(0, 19);
    const uid    = member.user?.id   ?? member.id;
    const uname  = member.user?.username ?? "unknown";
    const roles  = member.roles?.cache
      .filter(r => r.name !== "@everyone")
      .map(r => r.name)
      .join(", ") || "none";

    const embed = new EmbedBuilder()
      .setColor(COLORS.red)
      .setAuthor({
        name:    `${member.user?.tag ?? uid} — left`,
        iconURL: member.user?.displayAvatarURL(),
      })
      .setDescription([
        "```",
        `${ts} kernel: process terminated`,
        `  uid=${uid}(${uname})`,
        `  gid=${member.guild.id}(${member.guild.name})`,
        `  roles=${roles}`,
        `  action=LEAVE`,
        `  exit_code=0`,
        "```",
      ].join("\n"))
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(err =>
      logger.error("leave", "Failed to post leave log", err)
    );
  },
};
