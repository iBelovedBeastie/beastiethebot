/**
 * Snapshot Service
 * ─────────────────
 * Saves a JSON "snapshot" of the current guild state (channels + roles)
 * so you can diff or restore later — like `git stash` for your server.
 *
 * Files live in SNAPSHOT_DIR:
 *   snapshots/
 *   ├── index.json          ← manifest of all snapshots
 *   └── snap_<id>.json      ← full guild state dump
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Guild, Role, GuildChannel } from "discord.js";
import { ChannelType } from "discord.js";
import { env } from "../utils/env.ts";
import { logger } from "../utils/logger.ts";
import type { SnapshotMeta, SnapshotIndex } from "../types/index.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoleSnapshot {
  id: string;
  name: string;
  color: string;
  hoist: boolean;
  mentionable: boolean;
  permissions: string;
  position: number;
}

interface ChannelSnapshot {
  id: string;
  name: string;
  type: number;
  position: number;
  topic: string | null;
  parentId: string | null;
  rateLimitPerUser: number;
  userLimit?: number;
}

interface GuildSnapshot {
  meta: SnapshotMeta;
  roles: RoleSnapshot[];
  channels: ChannelSnapshot[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensureDir(): Promise<void> {
  if (!existsSync(env.SNAPSHOT_DIR)) {
    await mkdir(env.SNAPSHOT_DIR, { recursive: true });
  }
}

async function readIndex(): Promise<SnapshotIndex> {
  const path = join(env.SNAPSHOT_DIR, "index.json");
  if (!existsSync(path)) return { snapshots: [] };
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as SnapshotIndex;
}

async function writeIndex(index: SnapshotIndex): Promise<void> {
  const path = join(env.SNAPSHOT_DIR, "index.json");
  await writeFile(path, JSON.stringify(index, null, 2), "utf-8");
}

function makeId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    "snap",
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "_",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function createSnapshot(
  guild: Guild,
  createdBy: string,
  label: string
): Promise<SnapshotMeta> {
  await ensureDir();

  const roles: RoleSnapshot[] = guild.roles.cache
    .filter((r) => r.name !== "@everyone")
    .map((r: Role) => ({
      id:          r.id,
      name:        r.name,
      color:       r.hexColor,
      hoist:       r.hoist,
      mentionable: r.mentionable,
      permissions: r.permissions.bitfield.toString(),
      position:    r.position,
    }))
    .sort((a, b) => b.position - a.position);

  const channels: ChannelSnapshot[] = guild.channels.cache
    .map((c) => ({
      id:               c.id,
      name:             c.name,
      type:             c.type,
      position:         "position" in c ? c.position : 0,
      topic:            ("topic" in c ? c.topic : null) as string | null,
      parentId:         c.parentId ?? null,
      rateLimitPerUser: "rateLimitPerUser" in c ? Number(c.rateLimitPerUser) : 0,
      userLimit:        c.type === ChannelType.GuildVoice && "userLimit" in c
                          ? Number(c.userLimit)
                          : undefined,
    }))
    .sort((a, b) => a.position - b.position);

  const id = makeId();
  const filePath = join(env.SNAPSHOT_DIR, `${id}.json`);
  const meta: SnapshotMeta = {
    id,
    createdAt: new Date().toISOString(),
    createdBy,
    label,
    channelCount: channels.length,
    roleCount:    roles.length,
    filePath,
  };

  const full: GuildSnapshot = { meta, roles, channels };
  await writeFile(filePath, JSON.stringify(full, null, 2), "utf-8");

  // Update index, prune old snapshots beyond max
  const index = await readIndex();
  index.snapshots.unshift(meta);
  if (index.snapshots.length > env.SNAPSHOT_MAX) {
    index.snapshots.splice(env.SNAPSHOT_MAX);
  }
  await writeIndex(index);

  logger.info("snapshot", `Created ${id} (${roles.length} roles, ${channels.length} channels)`);
  return meta;
}

export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const index = await readIndex();
  return index.snapshots;
}

export async function getSnapshot(id: string): Promise<GuildSnapshot | null> {
  await ensureDir();
  const path = join(env.SNAPSHOT_DIR, `${id}.json`);
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as GuildSnapshot;
}

export async function diffSnapshots(
  idA: string,
  idB: string
): Promise<{ added: string[]; removed: string[]; changed: string[] }> {
  const [a, b] = await Promise.all([getSnapshot(idA), getSnapshot(idB)]);
  if (!a || !b) throw new Error("One or both snapshot IDs not found");

  const namesA = new Set(a.channels.map((c) => c.name));
  const namesB = new Set(b.channels.map((c) => c.name));

  const added   = [...namesB].filter((n) => !namesA.has(n));
  const removed = [...namesA].filter((n) => !namesB.has(n));

  // Channels present in both but with different topic/type
  const changed: string[] = [];
  for (const cA of a.channels) {
    const cB = b.channels.find((c) => c.name === cA.name);
    if (cB && (cA.topic !== cB.topic || cA.type !== cB.type)) {
      changed.push(cA.name);
    }
  }

  return { added, removed, changed };
}
