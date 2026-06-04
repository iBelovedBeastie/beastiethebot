# Beastie Bot — Setup Guide

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <repo>
cd Beastie
bun install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env and add your Discord credentials:
# - DISCORD_TOKEN: Your bot token from Discord Developer Portal
# - GUILD_ID: Your server ID (bot works ONLY in this server)
# - CLIENT_ID: Your app ID
```

### 3. Start Bot
```bash
bun start
```

**That's it!** The bot will:
- ✅ Auto-generate `config.json` with default triggers on first run
- ✅ Register slash commands
- ✅ Connect to your server
- ✅ Log everything

## 📋 Configuration

Auto-configuration:
1. Run `/init` (owner only) — This initializes the server with all roles, channels, and embeds
2. The bot automatically configures:
   - `welcome_msg` → points to #📜│etc-motd
   - `status` → points to #📢│etc-announcements

Manual reconfiguration:
- Use `/setwelcome <channel>` to change the welcome message target
- Use `/setstatus <channel>` to change the status message target

**Config file**: `config.json` is auto-generated on first startup and stores trigger channels.

## 📚 Available Commands

**System:**
```
/ping              # Bot latency
/whoami            # Your user info
/uname             # Server info
/uptime            # Bot uptime
/man               # Help & command list
/init              # Initialize server (owner only)
```

**Configuration:**
```
/setwelcome <#channel>    # Set welcome message channel (admin only)
/setstatus <#channel>     # Set status message channel (admin only)
/trigger <event>          # Send message now (admin only)
```

**Other:**
```
/snapshot          # Server snapshots (git-like)
/git               # GitHub commands
/fortune           # Random fortune
/cowsay            # ASCII cow
/distro            # Distro info
```

## 🎬 Using Triggers

After `/init`:
```
/setwelcome #announcements   # Configure welcome channel
/setstatus #status           # Configure status channel
/trigger welcome_msg         # Send now to configured channel
```

## 🔐 Security

- **Exclusive Server**: Bot only works in the GUILD_ID you specify
- **Admin Commands**: Restricted to @root, @wheel, @sysadmin, @admin roles
- **Owner Only**: `/init` requires server owner permissions

## 📝 Environment Variables

**Required:**
- `DISCORD_TOKEN` — Bot token
- `GUILD_ID` — Server ID (exclusive)
- `CLIENT_ID` — App ID

**Optional:**
- `CONFIG_FILE` — Path to config.json (default: ./config.json)
- `LOG_LEVEL` — Log level (default: info)
- `GITHUB_REPOS` — Comma-separated repos (e.g., torvalds/linux)
- `GITHUB_TOKEN` — GitHub token for polling

See `.env.example` for full documentation.

## 🛠️ Development

```bash
bun dev         # Watch mode with hot reload
bun lint        # TypeScript check
bun start       # Production start
```

## 📦 Tech Stack

- **Discord.js** v14 — Discord bot library
- **Bun** — Runtime & package manager
- **TypeScript** — Type safety
- **Zod** — Environment validation

## 🚨 Troubleshooting

**"Config load failed"**
- Check that config.json has valid JSON (or delete it to regenerate)
- Ensure channel IDs are valid strings

**"This bot is exclusive to one server"**
- Bot only works in the server specified by GUILD_ID
- Make sure you're using it in the correct server

**"Permission denied"**
- Admin commands require specific role names: root, wheel, sysadmin, admin
- Make sure your Discord roles match

## 📄 License

Open Source — See LICENSE file
