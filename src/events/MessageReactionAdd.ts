import {
  Events,
  MessageReaction,
  User,
  type PartialMessageReaction,
  type PartialUser,
} from "discord.js";
import { logger } from "../utils/logger.ts";
import { REACTION_ROLES } from "../utils/reactions.ts";

export default {
  name: Events.MessageReactionAdd,
  async execute(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ) {
    if (user.bot) return;
    if (reaction.partial) {
      try { await reaction.fetch(); } catch { return; }
    }

    const guild = reaction.message.guild;
    if (!guild) return;

    // FIXED: Scope reactions to specific channels so it doesn't fire on ANY message
    const channel = reaction.message.channel;
    if (!channel || !channel.isTextBased()) return;
    const chName = channel.name;

    const emoji = reaction.emoji.name ?? "";
    
    // Only fire on #login for ✅ or #etc-groups for role reactions
    if (emoji === "✅" && chName !== "✅│login") return;
    if (emoji !== "✅" && chName !== "🎯│etc-groups") return;

    const roleName = REACTION_ROLES[emoji];
    if (!roleName) return;

    try {
      const member = await guild.members.fetch(user.id);
      const role   = guild.roles.cache.find(r => r.name === roleName);
      if (!role) return;

      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role, `Reaction role: ${emoji}`);
        logger.info("reaction", `${user.tag} → +${roleName}`);
      }
    } catch (err) {
      logger.error("reaction", `Failed to assign role ${roleName}`, err);
    }
  },
};
