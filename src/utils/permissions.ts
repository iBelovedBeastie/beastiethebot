/**
 * Permissions Utility
 * ───────────────────
 * Role-based access control for admin commands.
 */

import type { GuildMember } from "discord.js";

export const ADMIN_ROLES = ["root", "wheel", "sysadmin"];

export function isAdmin(member: GuildMember | null | undefined): boolean {
  if (!member) return false;
  if (!("roles" in member)) return false;

  const roles = member.roles;
  if (!("cache" in roles)) return false;

  return roles.cache.some(r => ADMIN_ROLES.includes(r.name.toLowerCase()));
}
