/**
 * Provision Service
 * ─────────────────
 * Creates all roles, categories, and channels with Unix-themed names.
 * Called by /init. Separated from the command so it can be imported/tested.
 */

import {
  Guild,
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  EmbedBuilder,
  type TextChannel,
  type CategoryChannel,
  type OverwriteResolvable,
} from "discord.js";
import { logger } from "../utils/logger.ts";
import { setTrigger, saveTrigger } from "./config.ts";
import { env } from "../utils/env.ts";

// ── Types ─────────────────────────────────────────────────────────────────────
interface RoleDef {
  name: string;
  color: `#${string}`;
  permissions: bigint[];
  hoist?: boolean;
  mentionable?: boolean;
}

// ── Channel helpers ───────────────────────────────────────────────────────────
async function createCat(
  guild: Guild,
  name: string,
  ow: OverwriteResolvable[]
): Promise<CategoryChannel> {
  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: ow,
  }) as Promise<CategoryChannel>;
}

async function createTxt(
  cat: CategoryChannel,
  name: string,
  topic: string,
  ow?: OverwriteResolvable[],
  slowmode = 0
): Promise<TextChannel> {
  logger.debug("provision", `  + #${name}`);
  return cat.guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: cat.id,
    topic,
    rateLimitPerUser: slowmode,
    permissionOverwrites: ow ?? [...cat.permissionOverwrites.cache.values()],
  }) as Promise<TextChannel>;
}

async function createVoice(
  cat: CategoryChannel,
  name: string,
  userLimit = 0
): Promise<void> {
  logger.debug("provision", `  + 🔊 ${name}`);
  await cat.guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: cat.id,
    userLimit,
    permissionOverwrites: [...cat.permissionOverwrites.cache.values()],
  });
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function provisionGuild(guild: Guild): Promise<void> {
  // ── PHASE 1: Roles ──────────────────────────────────────────────────────────
  logger.info("provision", "Phase 1: creating roles");

  const roleDefs: RoleDef[] = [
    // Privilege hierarchy
    { name: "root",              color: "#FF0000", permissions: [PermissionFlagsBits.Administrator],                                                                     hoist: true,  mentionable: true  },
    { name: "wheel",             color: "#FF8C00", permissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageMessages], hoist: true,  mentionable: true  },
    { name: "sysadmin",          color: "#FFD700", permissions: [PermissionFlagsBits.KickMembers,    PermissionFlagsBits.ManageMessages, PermissionFlagsBits.MoveMembers], hoist: true,  mentionable: true  },
    { name: "maintainer",        color: "#FFA500", permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.EmbedLinks],                                    hoist: true,  mentionable: true  },
    { name: "contrib",           color: "#00FF7F", permissions: [PermissionFlagsBits.EmbedLinks,     PermissionFlagsBits.AttachFiles],                                   hoist: true,  mentionable: true  },
    { name: "user",              color: "#5865F2", permissions: [PermissionFlagsBits.SendMessages,   PermissionFlagsBits.ViewChannel, PermissionFlagsBits.AddReactions], hoist: true,  mentionable: false },
    { name: "nobody",            color: "#808080", permissions: [],                                                                                                       hoist: false, mentionable: false },
    { name: "daemon",            color: "#9932CC", permissions: [],                                                                                                       hoist: false, mentionable: false },
    // Distros
    { name: "arch-btw",          color: "#1793D1", permissions: [] },
    { name: "gentoo-chad",       color: "#6A5ACD", permissions: [] },
    { name: "void-musl",         color: "#2E8B57", permissions: [] },
    { name: "nix-reproducible",  color: "#7EBAE4", permissions: [] },
    { name: "debian-stable",     color: "#A80030", permissions: [] },
    { name: "fedora-spin",       color: "#51A2DA", permissions: [] },
    { name: "opensuse-leap",     color: "#73BA25", permissions: [] },
    { name: "ubuntu-user",       color: "#E95420", permissions: [] },
    { name: "alpine-minimalist", color: "#0D597F", permissions: [] },
    { name: "slackware-elder",   color: "#4B4B4B", permissions: [] },
    { name: "bsd-daemon",        color: "#CC0000", permissions: [] },
    // Editors
    { name: "vim-chad",          color: "#019833", permissions: [] },
    { name: "neovim-riced",      color: "#57A143", permissions: [] },
    { name: "emacs-enjoyer",     color: "#7F5AB6", permissions: [] },
    { name: "vscode-normie",     color: "#007ACC", permissions: [] },
    { name: "nano-pleb",         color: "#AAAAAA", permissions: [] },
    { name: "helix-hipster",     color: "#FF6D00", permissions: [] },
    { name: "ed-ascetic",        color: "#444444", permissions: [] },
    // Shells
    { name: "bash-scripter",     color: "#4EAA25", permissions: [] },
    { name: "zsh-ohmyzer",       color: "#C397D8", permissions: [] },
    { name: "fish-enjoyer",      color: "#FF6347", permissions: [] },
    { name: "nushell-sigma",     color: "#3D9970", permissions: [] },
    // DEs / WMs
    { name: "i3-gaps-user",      color: "#E53935", permissions: [] },
    { name: "hyprland-wayland",  color: "#00B4D8", permissions: [] },
    { name: "sway-tiler",        color: "#486579", permissions: [] },
    { name: "kde-plasma",        color: "#1D99F3", permissions: [] },
    { name: "gnome-enjoyer",     color: "#4A86CF", permissions: [] },
    { name: "xfce-lightweight",  color: "#2B4EA8", permissions: [] },
    { name: "dwm-patches",       color: "#888888", permissions: [] },
    // Hardware & gaming
    { name: "steam-deck",        color: "#1A9FFF", permissions: [] },
    { name: "nvidia-sufferer",   color: "#76B900", permissions: [] },
    { name: "amd-enjoyer",       color: "#ED1C24", permissions: [] },
    { name: "thinkpad-owner",    color: "#D22630", permissions: [] },
    { name: "framework-user",    color: "#7C4DFF", permissions: [] },
    // Badges
    { name: "rm-rf-survivor",    color: "#FF4500", permissions: [] },
    { name: "compile-king",      color: "#FFD700", permissions: [] },
    { name: "segfault-champion", color: "#FF1493", permissions: [] },
    { name: "git-blame-victim",  color: "#F05033", permissions: [] },
    { name: "100-pr-merged",     color: "#6E40C9", permissions: [] },
    { name: "copypasta-scholar", color: "#C0C0C0", permissions: [] },
  ];

  const roles: Record<string, string> = {}; // name → id

  // Clean up existing roles to prevent duplicates on re-init
  logger.debug("provision", "Cleaning up existing roles");
  for (const def of roleDefs) {
    const existing = guild.roles.cache.find(r => r.name === def.name);
    if (existing) {
      await existing.delete("provision — clean slate").catch(() => {});
    }
  }

  for (const def of roleDefs) {
    // @ts-ignore - discord.js v14 deprecation warning for color field (still works)
    const r = await guild.roles.create({
      name:        def.name,
      color:       def.color,
      permissions: def.permissions,
      hoist:       def.hoist        ?? false,
      mentionable: def.mentionable  ?? false,
      reason:      "server provisioning",
    });
    roles[def.name] = r.id;
    logger.debug("provision", `  + role: ${def.name}`);
  }

  // ── PHASE 2: Purge & rebuild channels ───────────────────────────────────────
  logger.info("provision", "Phase 2: purging channels");
  for (const ch of guild.channels.cache.values()) {
    await ch.delete("provision — clean slate").catch(() => {});
  }

  logger.info("provision", "Phase 2: creating channels");

  const everyone   = guild.id;
  const r          = (name: string) => roles[name] ?? everyone;

  const publicOW: OverwriteResolvable[] = [
    { id: everyone,         allow: [PermissionFlagsBits.ViewChannel], deny:  [PermissionFlagsBits.SendMessages], type: OverwriteType.Role },
    { id: r("user"),        allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.AddReactions, PermissionFlagsBits.ReadMessageHistory], type: OverwriteType.Role },
    { id: r("nobody"),      allow: [PermissionFlagsBits.ViewChannel],  deny: [PermissionFlagsBits.SendMessages], type: OverwriteType.Role },
    { id: r("wheel"),       allow: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.PinMessages], type: OverwriteType.Role },
    { id: r("daemon"),      allow: [PermissionFlagsBits.SendMessages,  PermissionFlagsBits.ViewChannel], type: OverwriteType.Role },
  ];

  const readOnlyOW: OverwriteResolvable[] = [
    { id: everyone,         allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages], type: OverwriteType.Role },
    { id: r("user"),        allow: [PermissionFlagsBits.ViewChannel,  PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions], deny: [PermissionFlagsBits.SendMessages], type: OverwriteType.Role },
    { id: r("wheel"),       allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages], type: OverwriteType.Role },
  ];

  const staffOW: OverwriteResolvable[] = [
    { id: everyone,         deny:  [PermissionFlagsBits.ViewChannel], type: OverwriteType.Role },
    { id: r("root"),        allow: [PermissionFlagsBits.ViewChannel,  PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages], type: OverwriteType.Role },
    { id: r("wheel"),       allow: [PermissionFlagsBits.ViewChannel,  PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages], type: OverwriteType.Role },
    { id: r("sysadmin"),    allow: [PermissionFlagsBits.ViewChannel,  PermissionFlagsBits.SendMessages], type: OverwriteType.Role },
  ];

  const maintainerOW: OverwriteResolvable[] = [
    ...staffOW,
    { id: r("maintainer"), allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages], type: OverwriteType.Role },
  ];

  // ── /etc ────────────────────────────────────────────────────────────────────
  const catEtc = await createCat(guild, "📋 ╔═ /etc ══╗", readOnlyOW);
  const chMotd      = await createTxt(catEtc, "📜│etc-motd",         "☞ Read before speaking");
  const chAnnounce  = await createTxt(catEtc, "📢│etc-announcements","☞ Important broadcasts");
  const chChangelog = await createTxt(catEtc, "📓│etc-changelog",    "☞ Server update log");
  const chLogin     = await createTxt(catEtc, "✅│login",            "☞ React ✅ to verify", publicOW);
  const chGroups    = await createTxt(catEtc, "🎯│etc-groups",       "☞ Pick your roles", publicOW);
  const chRoles     = await createTxt(catEtc, "🏆│etc-roles-info",   "☞ Role descriptions");

  // ── /home ───────────────────────────────────────────────────────────────────
  const catHome = await createCat(guild, "💬 ╠═ /home ═╣", publicOW);
  const chLounge = await createTxt(catHome, "💬│home-lounge",      "☞ General chat");
  await createTxt(catHome, "🌅│home-introductions", "☞ Who are you? What do you run?");
  await createTxt(catHome, "📸│home-showcase",      "☞ Rices, setups, dotfiles");
  await createTxt(catHome, "😂│tmp-shitposting",    "☞ Memes, off-topic, kernel jokes", publicOW, 3);
  await createTxt(catHome, "🔗│home-links",         "☞ Interesting links, blogs, papers");
  await createTxt(catHome, "🤔│home-opinions",      "☞ Tech opinions, hot takes");
  await createTxt(catHome, "🌐│home-offtopic",      "☞ Everything else");
  // NOTE: "join-to-generate" voice channels are placeholders for a future feature
  // that would automatically create temporary private voice channels when users join.
  // Currently they serve as general voice channels. Implement voiceStateUpdate event
  // handler in src/events/ to add dynamic channel generation functionality.
  await createVoice(catHome, "🎙️┤join-to-generate", 0);

  // ── /usr/share/distro ───────────────────────────────────────────────────────
  const catDistro = await createCat(guild, "🐧 ╠═ /usr/share/distro ═╣", publicOW);
  await createTxt(catDistro, "🏹│arch-general",      "☞ All things Arch");
  await createTxt(catDistro, "🧬│gentoo-USE-flags",  "☞ Compile times and USE flags");
  await createTxt(catDistro, "🌀│nix-flakes",        "☞ NixOS, flakes, home-manager");
  await createTxt(catDistro, "🕳️│void-runit",        "☞ Void Linux & runit init");
  await createTxt(catDistro, "🔴│redhat-ecosystem",  "☞ Fedora, RHEL, CentOS");
  await createTxt(catDistro, "🟠│debian-stable",     "☞ Debian/Ubuntu family");
  await createTxt(catDistro, "👹│bsd-lounge",        "☞ OpenBSD, FreeBSD, NetBSD");
  await createTxt(catDistro, "🗻│suse-land",         "☞ openSUSE, Leap, Tumbleweed");
  await createTxt(catDistro, "🤷│distro-wars",       "☞ Flame wars go here", publicOW, 10);

  // ── /usr/bin/editors ────────────────────────────────────────────────────────
  const catEditors = await createCat(guild, "⌨️ ╠═ /usr/bin/editors ═╣", publicOW);
  await createTxt(catEditors, "🧛│vim-wizardry",      "☞ Vimscript, macros, motions");
  await createTxt(catEditors, "🌌│neovim-config",     "☞ Neovim, Lua configs, plugins");
  await createTxt(catEditors, "🐄│emacs-lisp",        "☞ Emacs, org-mode, doom/spacemacs");
  await createTxt(catEditors, "🔷│vscode-extensions", "☞ VS Code setups and extensions");
  await createTxt(catEditors, "🔥│helix-zed",         "☞ Helix, Zed, modern editors");
  await createTxt(catEditors, "🪵│editor-wars",       "☞ Debate your choices. Civilly.", publicOW, 10);

  // ── /proc/desktops ──────────────────────────────────────────────────────────
  const catDE = await createCat(guild, "🖥️ ╠═ /proc/desktops ═╣", publicOW);
  await createTxt(catDE, "🪟│tiling-wm",          "☞ i3, Sway, dwm, bspwm, Qtile");
  await createTxt(catDE, "💧│hyprland-wayland",   "☞ Hyprland, nwg, waybar configs");
  await createTxt(catDE, "🔵│kde-plasma",         "☞ KDE Plasma, KWin, Krunner");
  await createTxt(catDE, "🍩│gnome-extensions",   "☞ GNOME, extensions, gsettings");
  await createTxt(catDE, "🍃│xfce-lxde-mate",     "☞ Lightweight DEs");
  await createTxt(catDE, "📸│desktop-ricing",      "☞ Post dotfiles and screenshots");
  await createVoice(catDE, "🖥️┤join-to-generate",  6);

  // ── /src ────────────────────────────────────────────────────────────────────
  const catSrc = await createCat(guild, "🛠️ ╠═ /src ═╣", publicOW);
  await createTxt(catSrc, "💻│src-general",       "☞ General programming talk");
  await createTxt(catSrc, "🦀│src-rust",           "☞ Rust, cargo, ownership");
  await createTxt(catSrc, "🐍│src-python",         "☞ Python, pip, virtualenvs");
  await createTxt(catSrc, "☕│src-go-cpp",         "☞ Go, C, C++ systems programming");
  await createTxt(catSrc, "🌐│src-webdev",         "☞ Frontend, backend, fullstack");
  await createTxt(catSrc, "🐚│src-shell-scripts",  "☞ Bash, zsh, POSIX sh");
  await createTxt(catSrc, "🐛│src-bug-reports",    "☞ Logs or it didn't happen");
  await createTxt(catSrc, "✨│src-feature-req",    "☞ Keep requests scoped");
  await createTxt(catSrc, "🔀│src-code-review",    "☞ Post PRs or snippets");
  await createTxt(catSrc, "🤖│src-ai-ml",          "☞ AI/ML, LLMs, the future overlords");
  await createVoice(catSrc, "💻┤join-to-generate",  4);

  // ── /var/cloud ──────────────────────────────────────────────────────────────
  const catCloud = await createCat(guild, "☁️ ╠═ /var/cloud ═╣", publicOW);
  await createTxt(catCloud, "🐳│var-docker",       "☞ Docker, Podman, containers");
  await createTxt(catCloud, "☸️│var-kubernetes",   "☞ k8s, Helm, k3s");
  await createTxt(catCloud, "🏠│var-selfhosted",   "☞ Homelab, self-hosted apps");
  await createTxt(catCloud, "📡│var-networking",   "☞ VPNs, firewalls, DNS");
  await createTxt(catCloud, "🔐│var-security",     "☞ CVEs, hardening, FOSS security");
  await createTxt(catCloud, "⚡│var-ci-cd",        "☞ GitHub Actions, Gitea, CI");
  await createTxt(catCloud, "📡│github-feed",      "☞ Subscribed repo activity [bot]", readOnlyOW);
  await createTxt(catCloud, "📋│var-log-syslog",   "☞ Join/leave system log [bot]",    readOnlyOW);

  // ── /sys/fs/oss ─────────────────────────────────────────────────────────────
  const catOSS = await createCat(guild, "🔓 ╠═ /sys/fs/oss ═╣", publicOW);
  await createTxt(catOSS, "📜│oss-licenses",      "☞ GPL, MIT, Apache debates");
  await createTxt(catOSS, "🗳️│oss-governance",    "☞ Project governance, foundations");
  await createTxt(catOSS, "🛡️│oss-privacy",       "☞ Privacy tools, de-googling");
  await createTxt(catOSS, "📰│oss-news",           "☞ OSS news, drama, releases");
  await createTxt(catOSS, "⚖️│oss-ethics",         "☞ Tech ethics, FOSS philosophy");
  await createTxt(catOSS, "💸│oss-funding",        "☞ Sustainability and funding models");

  // ── /opt/games ──────────────────────────────────────────────────────────────
  const catGames = await createCat(guild, "🎮 ╠═ /opt/games ═╣", publicOW);
  await createTxt(catGames, "🎮│games-general",    "☞ General Linux gaming");
  await createTxt(catGames, "🚀│games-steam-deck", "☞ Steam Deck, Proton, SteamOS");
  await createTxt(catGames, "🍷│games-proton",     "☞ Proton/Wine compat reports");
  await createTxt(catGames, "🕹️│games-native",     "☞ Native Linux games");
  await createTxt(catGames, "📊│games-benchmarks", "☞ FPS reports, perf tweaks");
  await createVoice(catGames, "🎮┤join-to-generate", 10);

  // ── /usr/bin (bots) ─────────────────────────────────────────────────────────
  const catBot = await createCat(guild, "🤖 ╠═ /usr/bin ═╣", publicOW);
  const chBash = await createTxt(catBot, "⚡│usr-bin-bash",   "☞ Bot commands");
  await createTxt(catBot, "📊│usr-bin-stats",    "☞ Server activity [bot]", readOnlyOW);
  await createTxt(catBot, "🎲│usr-bin-fun",      "☞ Fun commands");

  // ── /root (staff) ───────────────────────────────────────────────────────────
  const catRoot = await createCat(guild, "🔒 ╠═ /root [RESTRICTED] ═╣", staffOW);
  await createTxt(catRoot, "🏛️│root-staff",       "☞ Staff lounge", staffOW);
  await createTxt(catRoot, "🚨│root-modlog",      "☞ Moderation log", staffOW);
  await createTxt(catRoot, "📋│root-todo",        "☞ Sysadmin task list", staffOW);
  await createTxt(catRoot, "🗳️│root-votes",       "☞ Staff decision votes", staffOW);
  await createVoice(catRoot, "🔒┤root-vc", 0);

  // ── /mnt/maintainers ────────────────────────────────────────────────────────
  const catMnt = await createCat(guild, "🌿 ╚═ /mnt/maintainers ═╝", maintainerOW);
  await createTxt(catMnt, "🌿│mnt-general",      "☞ Maintainer coordination", maintainerOW);
  await createTxt(catMnt, "📦│mnt-releases",     "☞ Release planning", maintainerOW);
  await createTxt(catMnt, "🔍│mnt-review-queue", "☞ PRs awaiting review", maintainerOW);
  await createVoice(catMnt, "🌿┤join-to-generate", 8);

  // ── PHASE 3: Seed content ───────────────────────────────────────────────────
  logger.info("provision", "Phase 3: posting embeds");
  await postMotd(chMotd);
  await postLogin(chLogin);
  await postGroups(chGroups);
  await postRolesInfo(chRoles);
  await postBotHelp(chBash);
  await postAnnouncement(chAnnounce);
  await postChangelog(chChangelog);

  // ── PHASE 4: Auto-configure triggers ───────────────────────────────────────
  logger.info("provision", "Phase 4: configuring triggers");
  setTrigger("welcome_msg", chMotd.id);
  setTrigger("status", chAnnounce.id);
  
  // Save triggers to disk so they persist across bot restarts
  await saveTrigger("welcome_msg", chMotd.id, env.CONFIG_FILE);
  await saveTrigger("status", chAnnounce.id, env.CONFIG_FILE);
  
  logger.debug("provision", `  + welcome_msg → #${chMotd.name}`);
  logger.debug("provision", `  + status → #${chAnnounce.name}`);

  logger.info("provision", "Done ✓");
}

// ── Embed content helpers ─────────────────────────────────────────────────────

export async function postMotd(ch: TextChannel) {
  await ch.send({
    embeds: [new EmbedBuilder()
      .setTitle("┌──────────────────────────────────┐\n│      /etc/motd — Message of the Day      │\n└──────────────────────────────────┘")
      .setDescription(["```", "██████╗ ███████╗███████╗", "██╔══██╗██╔════╝██╔════╝", "██║  ██║███████╗███████╗", "██║  ██║╚════██║╚════██║", "██████╔╝███████║███████║", "╚═════╝ ╚══════╝╚══════╝", "   Open Source Society   ", "```"].join("\n"))
      .setColor("#00FF00")
      .addFields(
        { name: "§1 · Be Respectful",          value: "> No personal attacks, harassment, or discrimination. We run the same kernel." },
        { name: "§2 · Use the Right Channel",  value: "> Dev talk in `/src`, memes in `/tmp`, gaming in `/opt/games`. Wrong mount point → deleted." },
        { name: "§3 · No Spam",                value: "> No unsolicited DMs. No invite flooding. Keep fork bombs in a VM." },
        { name: "§4 · Submit Proper Reports",  value: `> "It doesn't work" is not a bug report. Include: OS, version, steps, logs.` },
        { name: "§5 · Format Your Code",       value: `> Use \`\`\` for code. Raw log dumps → instant \`chmod 000\`.` },
        { name: "§6 · Respect the Hierarchy",  value: `> Don't ping \`@root\` or \`@wheel\` unless the server is literally on fire.` },
        { name: "§7 · FOSS First",             value: "> Promote freedom, openness, and the GPL. This is an OSS community." },
        { name: "⚠️ Enforcement",              value: "```\nwarn() → timeout() → ban()\n\nSeverity at sysadmin discretion.\n```" },
      )
      .setFooter({ text: "♻️ Last modified by root — Free as in freedom" }),
    ],
  });
}

async function postLogin(ch: TextChannel) {
  const embed = new EmbedBuilder()
    .setTitle("🔐 /login — Authentication Required")
    .setDescription([
      "```diff", "- STATUS: UNAUTHENTICATED",
      "+ ACTION: React ✅ below to accept rules and gain access", "```", "",
      "**Privilege level:** `nobody`  →  react to become `user`", "",
      "```sh", "$ sudo usermod -aG user $YOU", "[sudo] password: ✅", "```",
    ].join("\n"))
    .setColor("#FF4500")
    .setFooter({ text: "⚠️ Failure to comply → chmod 000 $YOU" });
  const msg = await ch.send({ embeds: [embed] });
  await msg.react("✅");
}

async function postGroups(ch: TextChannel) {
  await ch.send({ embeds: [new EmbedBuilder().setTitle("📂 /etc/groups — Pick Your Roles").setColor("#1793D1").setDescription("React to assign cosmetic roles. Multi-select is fine.")] });

  const distroMsg = await ch.send({ embeds: [new EmbedBuilder().setTitle("🐧 Distro").setColor("#73BA25").setDescription(["🏹 arch-btw","🧬 gentoo-chad","🕳️ void-musl","🌀 nix-reproducible","🔴 fedora-spin","🟠 debian-stable","🟡 ubuntu-user","🗻 opensuse-leap","⬜ alpine-minimalist","⬛ slackware-elder","👹 bsd-daemon"].join("\n"))] });
  for (const e of ["🏹","🧬","🕳️","🌀","🔴","🟠","🟡","🗻","⬜","⬛","👹"]) await distroMsg.react(e).catch(() => {});

  const editorMsg = await ch.send({ embeds: [new EmbedBuilder().setTitle("⌨️ Editor").setColor("#019833").setDescription(["🧛 vim-chad","🌌 neovim-riced","🐄 emacs-enjoyer","🔷 vscode-normie","🪵 nano-pleb","🔥 helix-hipster","⬛ ed-ascetic"].join("\n"))] });
  for (const e of ["🧛","🌌","🐄","🔷","🪵","🔥","⬛"]) await editorMsg.react(e).catch(() => {});

  const shellMsg = await ch.send({ embeds: [new EmbedBuilder().setTitle("🐚 Shell").setColor("#4EAA25").setDescription(["🟢 bash-scripter","🟣 zsh-ohmyzer","🐟 fish-enjoyer","🌊 nushell-sigma"].join("\n"))] });
  for (const e of ["🟢","🟣","🐟","🌊"]) await shellMsg.react(e).catch(() => {});

  const deMsg = await ch.send({ embeds: [new EmbedBuilder().setTitle("🖥️ Desktop / WM").setColor("#00B4D8").setDescription(["⬜ i3-gaps-user","💧 hyprland-wayland","🌊 sway-tiler","🔵 kde-plasma","🍩 gnome-enjoyer","🍃 xfce-lightweight","🪨 dwm-patches"].join("\n"))] });
  for (const e of ["⬜","💧","🌊","🔵","🍩","🍃","🪨"]) await deMsg.react(e).catch(() => {});

  const hwMsg = await ch.send({ embeds: [new EmbedBuilder().setTitle("🔧 Hardware").setColor("#76B900").setDescription(["🚀 steam-deck","🟢 nvidia-sufferer","🔴 amd-enjoyer","🖥️ thinkpad-owner","💡 framework-user"].join("\n"))] });
  for (const e of ["🚀","🟢","🔴","🖥️","💡"]) await hwMsg.react(e).catch(() => {});
}

async function postRolesInfo(ch: TextChannel) {
  await ch.send({ embeds: [new EmbedBuilder()
    .setTitle("🏆 /etc/roles — Role Hierarchy")
    .setColor("#FFD700")
    .addFields(
      { name: "🔴 root",       value: "Full admin. UID 0. Don't @ unless on fire." },
      { name: "🟠 wheel",      value: "Trusted moderators. Ban, manage channels, pin messages." },
      { name: "🟡 sysadmin",   value: "Moderation team. Kick, mute, manage messages." },
      { name: "🟠 maintainer", value: "Project maintainers. Access to /mnt/maintainers." },
      { name: "🟢 contrib",    value: "Regular contributors. Embed and file permissions." },
      { name: "🔵 user",       value: "Verified members. React ✅ in #login." },
      { name: "⚫ nobody",     value: "Unverified. Read-only." },
    )
    .setFooter({ text: "Ask wheel+ to promote you once you have contributed" }),
  ]});
}
async function postBotHelp(ch: TextChannel) {
  await ch.send({ embeds: [new EmbedBuilder()
    .setTitle("⚡ /usr/bin — Command Reference")
    .setColor("#5865F2")
    .setDescription("```sh\n$ ls /usr/bin\n```")
    .addFields(
      { name: "`/whoami`",    value: "Your uid, groups, join date",             inline: true },
      { name: "`/uname`",     value: "Server info",                             inline: true },
      { name: "`/uptime`",    value: "Bot uptime",                              inline: true },
      { name: "`/man`",       value: "Command documentation",                   inline: true },
      { name: "`/snapshot`",  value: "Create or list server snapshots",         inline: true },
      { name: "`/git`",       value: "Subscribe/list/unsub GitHub repos",       inline: true },
      { name: "`/fortune`",   value: "Random UNIX fortune",                     inline: true },
      { name: "`/cowsay`",    value: "ASCII art message",                       inline: true },
      { name: "`/hack`",      value: "Hollywood-style hacking terminal",        inline: true },
      { name: "`/distro`",    value: "Suggest a distro for your vibe",          inline: true },
      { name: "`/ping`",      value: "Bot latency",                             inline: true },
      { name: "`/8ball`",     value: "Ask the kernel oracle",                   inline: true },
    )
    .setFooter({ text: "$ man <command> for details" }),
  ]});
}

export async function postAnnouncement(ch: TextChannel) {
  await ch.send({ embeds: [new EmbedBuilder()
    .setTitle("📢 Server Initialized")
    .setDescription(["```diff", "+ [OK] Roles provisioned", "+ [OK] Channels mounted", "+ [OK] Permissions configured", "+ [OK] Content posted", "", "Welcome to the OSS community server.", "```", "", "📜 `#etc-motd`  |  ✅ `#login`  |  🎯 `#etc-groups`"].join("\n"))
    .setColor("#00FF7F").setTimestamp().setFooter({ text: "init process complete — PID 1" }),
  ]});
}

async function postChangelog(ch: TextChannel) {
  await ch.send({ embeds: [new EmbedBuilder()
    .setTitle("📓 /etc/changelog")
    .setColor("#808080")
    .setDescription(["```", `v1.0.0 — ${new Date().toISOString().split("T")[0]}`, "──────────────────────────────────", "+ Initial server provisioning", "+ 45+ roles created", "+ 65+ channels across 12 categories", "+ Slash commands: init, whoami, uname, uptime, man,", "  snapshot, git, fortune, cowsay, hack, distro, ping, 8ball", "+ Reaction roles in #etc-groups", "+ GitHub polling service", "+ Snapshot/diff system", "──────────────────────────────────", "Signed-off-by: root <root@localhost>", "```"].join("\n"))
    .setTimestamp(),
  ]});
}
