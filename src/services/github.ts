/**
 * GitHub Polling Service
 * ──────────────────────
 * Polls subscribed repos every N minutes for new commits and releases,
 * then posts formatted embeds to the #github-feed channel.
 *
 * State is persisted to snapshots/github-store.json so restarts don't
 * re-announce old events.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EmbedBuilder, type TextChannel, type Client } from "discord.js";
import { env } from "../utils/env.ts";
import { logger } from "../utils/logger.ts";
import { COLORS } from "../utils/embeds.ts";
import type { GitHubStore, GitHubRepo, GitHubCommit, GitHubRelease } from "../types/index.ts";

// Resolve paths relative to project root (not CWD)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(dirname(__dirname));
const resolvedSnapshotDir = resolve(projectRoot, env.SNAPSHOT_DIR);
const STORE_PATH = join(resolvedSnapshotDir, "github-store.json");
const POLL_MS    = 5 * 60 * 1000; // 5 minutes — gentle on Railway compute

// ── Persistence ───────────────────────────────────────────────────────────────

async function readStore(): Promise<GitHubStore> {
  if (!existsSync(STORE_PATH)) return { repos: [] };
  return JSON.parse(await readFile(STORE_PATH, "utf-8")) as GitHubStore;
}

async function writeStore(store: GitHubStore): Promise<void> {
  if (!existsSync(resolvedSnapshotDir)) {
    await mkdir(resolvedSnapshotDir, { recursive: true });
  }
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

// ── GitHub API ────────────────────────────────────────────────────────────────

async function ghFetch<T>(path: string): Promise<T | null> {
  const headers: Record<string, string> = {
    "Accept":     "application/vnd.github+json",
    "User-Agent": "oss-community-bot/1.0",
  };
  if (env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${env.GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    logger.warn("github", `${path} → HTTP ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

// ── Embed builders ────────────────────────────────────────────────────────────

function commitEmbed(repo: string, commit: GitHubCommit): EmbedBuilder {
  const shortSha = commit.sha.slice(0, 7);
  const firstLine = commit.commit.message.split("\n")[0] ?? "(no message)";
  const truncated = firstLine.length > 72 ? firstLine.slice(0, 69) + "..." : firstLine;

  return new EmbedBuilder()
    .setColor(COLORS.github)
    .setAuthor({
      name:    commit.author?.login ?? commit.commit.author.name,
      iconURL: commit.author?.avatar_url,
      url:     commit.author?.html_url,
    })
    .setTitle(`[\`${repo}\`] ${truncated}`)
    .setURL(commit.html_url)
    .setDescription(
      [
        `\`\`\``,
        `commit ${commit.sha}`,
        `Author: ${commit.commit.author.name}`,
        `Date:   ${new Date(commit.commit.author.date).toUTCString()}`,
        ``,
        `    ${firstLine}`,
        `\`\`\``,
      ].join("\n")
    )
    .addFields({ name: "🔗 Repository", value: `[\`${repo}\`](https://github.com/${repo})`, inline: true })
    .setFooter({ text: `${repo} · ${shortSha}` })
    .setTimestamp(new Date(commit.commit.author.date));
}

function releaseEmbed(repo: string, release: GitHubRelease): EmbedBuilder {
  const body = release.body?.slice(0, 400) ?? "";
  return new EmbedBuilder()
    .setColor(COLORS.green)
    .setAuthor({
      name:    release.author.login,
      iconURL: release.author.avatar_url,
    })
    .setTitle(`🚀 New Release: ${release.tag_name} — ${repo}`)
    .setURL(release.html_url)
    .setDescription(body ? `\`\`\`md\n${body}\n\`\`\`` : "*No release notes.*")
    .addFields(
      { name: "📦 Tag",        value: `\`${release.tag_name}\``, inline: true },
      { name: "📅 Published",  value: `<t:${Math.floor(new Date(release.published_at).getTime() / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: `${repo} — release` })
    .setTimestamp(new Date(release.published_at));
}

// ── Poll logic ────────────────────────────────────────────────────────────────

async function pollRepo(
  repo: GitHubRepo,
  feedChannel: TextChannel
): Promise<GitHubRepo> {
  const updated = { ...repo };
  const { owner, repo: name } = repo;
  const full = `${owner}/${name}`;

  // ── Check latest commit ──────────────────────
  const commits = await ghFetch<GitHubCommit[]>(`/repos/${full}/commits?per_page=1`);
  if (commits && commits.length > 0) {
    const latest = commits[0]!;
    if (latest.sha !== repo.lastCheckedSha) {
      if (repo.lastCheckedSha !== null) {
        // Only announce if we already had a baseline (not first run)
        await feedChannel.send({ embeds: [commitEmbed(full, latest)] });
        logger.info("github", `New commit on ${full}: ${latest.sha.slice(0, 7)}`);
      }
      updated.lastCheckedSha  = latest.sha;
      updated.lastCheckedAt   = new Date().toISOString();
    }
  }

  // ── Check latest release ─────────────────────
  const releases = await ghFetch<GitHubRelease[]>(`/repos/${full}/releases?per_page=1`);
  if (releases && releases.length > 0) {
    const latest = releases[0]!;
    const stored = repo.lastCheckedAt;
    if (stored && new Date(latest.published_at) > new Date(stored)) {
      await feedChannel.send({ embeds: [releaseEmbed(full, latest)] });
      logger.info("github", `New release on ${full}: ${latest.tag_name}`);
    }
  }

  return updated;
}

// ── Service start / subscribe / unsubscribe ───────────────────────────────────

export async function startGitHubPoller(client: Client): Promise<void> {
  if (!env.GITHUB_REPOS) {
    logger.info("github", "No repos configured — poller idle");
    return;
  }

  async function tick(): Promise<void> {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    const feedChannel = guild.channels.cache.find(
      (c) => c.name === env.GITHUB_FEED_CHANNEL
    ) as TextChannel | undefined;

    if (!feedChannel) {
      logger.warn("github", `Feed channel "${env.GITHUB_FEED_CHANNEL}" not found`);
      return;
    }

    const store = await readStore();
    const updated: GitHubRepo[] = [];

    for (const repo of store.repos) {
      try {
        updated.push(await pollRepo(repo, feedChannel));
      } catch (err) {
        logger.error("github", `Error polling ${repo.owner}/${repo.repo}`, err);
        updated.push(repo);
      }
    }

    store.repos = updated;
    await writeStore(store);
  }

  logger.info("github", `Poller started — interval ${POLL_MS / 1000}s`);
  setInterval(() => void tick(), POLL_MS);
  void tick(); // immediate first run
}

export async function subscribeRepo(ownerRepo: string): Promise<string> {
  const [owner, repo] = ownerRepo.split("/");
  if (!owner || !repo) throw new Error("Format must be owner/repo");

  // Validate via API
  const info = await ghFetch<{ full_name: string }>(`/repos/${owner}/${repo}`);
  if (!info) throw new Error(`Repo ${ownerRepo} not found or not accessible`);

  const store = await readStore();
  if (store.repos.some((r) => r.owner === owner && r.repo === repo)) {
    throw new Error(`${ownerRepo} is already subscribed`);
  }

  store.repos.push({ owner, repo, lastCheckedSha: null, lastCheckedAt: null });
  await writeStore(store);
  logger.info("github", `Subscribed to ${ownerRepo}`);
  return info.full_name;
}

export async function unsubscribeRepo(ownerRepo: string): Promise<void> {
  const [owner, repo] = ownerRepo.split("/");
  const store = await readStore();
  const before = store.repos.length;
  store.repos = store.repos.filter((r) => !(r.owner === owner && r.repo === repo));
  if (store.repos.length === before) throw new Error(`${ownerRepo} is not subscribed`);
  await writeStore(store);
  logger.info("github", `Unsubscribed from ${ownerRepo}`);
}

export async function listSubscriptions(): Promise<GitHubRepo[]> {
  const store = await readStore();
  return store.repos;
}

// Seed repos from env on first boot
export async function seedReposFromEnv(): Promise<void> {
  if (!env.GITHUB_REPOS) return;
  const store = await readStore();
  for (const entry of env.GITHUB_REPOS.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [owner, repo] = entry.split("/");
    if (!owner || !repo) continue;
    if (!store.repos.some((r) => r.owner === owner && r.repo === repo)) {
      store.repos.push({ owner, repo, lastCheckedSha: null, lastCheckedAt: null });
      logger.info("github", `Seeded repo from env: ${entry}`);
    }
  }
  await writeStore(store);
}
