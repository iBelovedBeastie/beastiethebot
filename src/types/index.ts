import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  Client,
} from "discord.js";

// ── Command shape ─────────────────────────────────────────────────────────────
export interface BotCommand {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

// ── Snapshot ──────────────────────────────────────────────────────────────────
export interface SnapshotMeta {
  id: string;           // e.g. "snap_20240604_143022"
  createdAt: string;    // ISO timestamp
  createdBy: string;    // Discord user tag
  label: string;        // human label
  channelCount: number;
  roleCount: number;
  filePath: string;
}

export interface SnapshotIndex {
  snapshots: SnapshotMeta[];
}

// ── GitHub subscription ───────────────────────────────────────────────────────
export interface GitHubRepo {
  owner: string;
  repo: string;
  lastCheckedSha: string | null;
  lastCheckedAt: string | null;
}

export interface GitHubStore {
  repos: GitHubRepo[];
}

// ── GitHub API responses (minimal) ───────────────────────────────────────────
export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
  author: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  author: {
    login: string;
    avatar_url: string;
  };
}

// ── Extended client ───────────────────────────────────────────────────────────
export interface BotClient extends Client {
  commands: Map<string, BotCommand>;
  startedAt: Date;
}
