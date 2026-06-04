import { EmbedBuilder, type ColorResolvable } from "discord.js";

export const COLORS = {
  green:   "#00FF7F" as ColorResolvable,
  red:     "#FF4500" as ColorResolvable,
  yellow:  "#FFD700" as ColorResolvable,
  blue:    "#5865F2" as ColorResolvable,
  purple:  "#9932CC" as ColorResolvable,
  orange:  "#FF8C00" as ColorResolvable,
  gray:    "#808080" as ColorResolvable,
  cyan:    "#00B4D8" as ColorResolvable,
  github:  "#F05033" as ColorResolvable,
  arch:    "#1793D1" as ColorResolvable,
};

export function successEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.green)
    .setTitle(`✅  ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function errorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.red)
    .setTitle(`❌  ${title}`)
    .setDescription(description)
    .setTimestamp();
}

export function infoEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.blue)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

/** Wrap text in a code block diff for terminal-style output */
export function diffBlock(lines: string[]): string {
  return "```diff\n" + lines.join("\n") + "\n```";
}

/** Wrap text in a shell code block */
export function shellBlock(lines: string[]): string {
  return "```sh\n" + lines.join("\n") + "\n```";
}

/** Format a unix-style timestamp string */
export function unixTime(date: Date = new Date()): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

export function relativeTime(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}
