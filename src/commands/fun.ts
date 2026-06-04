import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { BotCommand } from "../types/index.ts";
import { COLORS } from "../utils/embeds.ts";

// ── Fortune strings ───────────────────────────────────────────────────────────
const FORTUNES = [
  "In the beginning was the command line.\n  — Neal Stephenson",
  "Talk is cheap. Show me the code.\n  — Linus Torvalds",
  "Those who don't understand Unix are condemned to reinvent it, poorly.\n  — Henry Spencer",
  "The most powerful tool we have as developers is automation.\n  — Scott Hanselman",
  "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.\n  — Bill Gates",
  "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.\n  — Martin Fowler",
  "rm -rf /tmp/problems",
  "There is no place like ~",
  "The kernel doesn't care about your feelings.",
  "It works on my machine.\n  — Every developer, ever",
  "chmod 777 is never the answer.\n  — The Sysadmin's Bible",
  "Have you tried turning it off and on again?\n  — IT Crowd, also every sysadmin",
  "sudo make me a sandwich.\n  — xkcd #149",
  "A computer is like air conditioning: it becomes useless when you open Windows.",
  "Real programmers don't comment their code. If it was hard to write, it should be hard to read.",
  "The best error message is the one that never shows up.\n  — Thomas Fuchs",
  "Simplicity is the ultimate sophistication.\n  — Leonardo da Vinci (also applies to shell scripts)",
  "God is real, unless declared integer.\n  — Anonymous Fortran programmer",
  "The greatest performance improvement of all is when a system goes from not-working to working.\n  — John Ousterhout",
  "cat /dev/urandom | fortune",
  "Knock knock.\nRace condition.\nWho's there?",
  "There are only 10 types of people in the world: those who understand binary, and those who don't.",
  "Why do Java programmers wear glasses? Because they don't C#.",
  "A SQL query goes into a bar, walks up to two tables and asks... 'Can I join you?'",
  "ERROR: keyboard not found. Press F1 to continue.",
  "To understand recursion, you must first understand recursion.",
  "#!/bin/bash\necho 'I have no idea what I'm doing'",
  "It's not a bug — it's an undocumented feature.",
  "Code never lies; comments sometimes do.\n  — Ron Jeffries",
  "The first rule of optimization: don't do it.\n  — Michael A. Jackson",
  "git commit -m 'fix'",
  "git commit -m 'final fix'",
  "git commit -m 'final final fix'",
  "git commit -m 'ok THIS is the actual final fix'",
  "You are not expected to understand this.\n  — Unix V6 source code comment",
  "Never trust a programmer who says they know C++.\n  — Bjarne Stroustrup, probably",
  "The best way to get a project done faster is to start sooner.\n  — Jim Highsmith",
  "dd if=/dev/zero of=/dev/sda  ← don't",
  "Arch Linux: I use it, btw.",
  "NixOS: reproducible, declarative, and will make you question your life choices.",
  "Gentoo: why use binaries when you can compile for 3 days straight?",
];

// ── Distro quiz data ──────────────────────────────────────────────────────────
const DISTROS: Record<string, { name: string; color: number; desc: string; url: string }> = {
  "beginner-simple":    { name: "Ubuntu",     color: 0xE95420, desc: "Batteries included, massive community, great for first-timers.", url: "https://ubuntu.com" },
  "beginner-gaming":    { name: "Pop!_OS",    color: 0x48B9C7, desc: "Ubuntu base with excellent NVIDIA/AMD driver support and a great gaming experience out of the box.", url: "https://pop.system76.com" },
  "power-rolling":      { name: "Arch Linux", color: 0x1793D1, desc: "Rolling release, AUR, total control. You build it yourself. You know this.", url: "https://archlinux.org" },
  "power-stable":       { name: "Fedora",     color: 0x51A2DA, desc: "Cutting-edge packages, RPM ecosystem, Red Hat backing. Stable enough to daily-drive, fresh enough to stay happy.", url: "https://fedoraproject.org" },
  "reproducible":       { name: "NixOS",      color: 0x7EBAE4, desc: "Fully declarative and reproducible. `configuration.nix` IS your system. High learning curve, unmatched consistency.", url: "https://nixos.org" },
  "minimalist-musl":    { name: "Void Linux",  color: 0x2E8B57, desc: "runit init, musl or glibc, XBPS package manager. Lean, fast, independent. No systemd.", url: "https://voidlinux.org" },
  "source-based":       { name: "Gentoo",     color: 0x6A5ACD, desc: "Compile everything from source with your own USE flags. Maximum optimization. Infinite patience required.", url: "https://gentoo.org" },
  "enterprise-stable":  { name: "Debian",     color: 0xA80030, desc: "The universal OS. Rock-solid stable, massive repo, underpins half the internet. \"Stable\" means stable.", url: "https://debian.org" },
  "bsd-security":       { name: "OpenBSD",    color: 0xF0C000, desc: "Security-first BSD. Pledge/unveil, clean codebase, strong crypto. The paranoid admin's choice.", url: "https://openbsd.org" },
  "container-server":   { name: "Alpine Linux",color: 0x0D597F, desc: "Tiny, musl-based, BusyBox. Lives in Docker containers. Minimal attack surface. Weighs nothing.", url: "https://alpinelinux.org" },
};

// ── 8ball answers ─────────────────────────────────────────────────────────────
const EIGHTBALL = [
  // Positive
  "Segfault-free.", "Return code: 0.", "`echo yes`", "The kernel approves.",
  "Compiled without warnings.", "All tests pass.", "LGTM 🟢", "Merge when ready.",
  // Neutral
  "The scheduler will decide.", "Depends on your USE flags.", "Have you checked the Arch Wiki?",
  "Try it in a VM first.", "man page is inconclusive.", "It's in the backlog.",
  // Negative
  "Segmentation fault (core dumped).", "Permission denied.", "`rm -rf` is not the answer.",
  "Have you tried reading the docs?", "This is a known bug.", "Out of memory — killed.",
  "The answer is in the logs.", "LKML thread from 2003 disagrees.", "Works on my machine.",
  "Return code: 1.", "Bad file descriptor.", "Connection refused.",
];

// ── Cowsay art ────────────────────────────────────────────────────────────────
function cowsay(msg: string): string {
  const words = msg.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > 38) {
      lines.push(line.trim());
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) lines.push(line.trim());

  const width = Math.max(...lines.map(l => l.length));
  const top    = " " + "_".repeat(width + 2);
  const bottom = " " + "-".repeat(width + 2);
  const body   = lines.length === 1
    ? `< ${lines[0]!.padEnd(width)} >`
    : lines.map((l, idx) => {
        const left  = idx === 0 ? "/" : idx === lines.length - 1 ? "\\" : "|";
        const right = idx === 0 ? "\\" : idx === lines.length - 1 ? "/" : "|";
        return `${left} ${l.padEnd(width)} ${right}`;
      }).join("\n");

  return [
    top,
    body,
    bottom,
    "        \\   ^__^",
    "         \\  (oo)\\_______",
    "            (__)\\       )\\/\\",
    "                ||----w |",
    "                ||     ||",
  ].join("\n");
}

// ── Hack sequence ─────────────────────────────────────────────────────────────
function hackSequence(target: string): string[] {
  return [
    `\`\`\``,
    `$ nmap -sV -p- ${target}`,
    `Starting Nmap 7.94 ( https://nmap.org )`,
    `Discovered open port 22/tcp on ${target}`,
    `Discovered open port 443/tcp on ${target}`,
    `Discovered open port 31337/tcp on ${target}`,
    ``,
    `$ exploit --target ${target} --payload reverse_shell`,
    `[*] Connecting to ${target}:31337...`,
    `[*] Bypassing firewall rules...`,
    `[+] Got shell as www-data`,
    `[*] Escalating privileges...`,
    `[+] Got root via CVE-2024-1337`,
    ``,
    `root@${target}:~# whoami`,
    `root`,
    `root@${target}:~# cat /etc/shadow | head -3`,
    `root:$6$xyz$REDACTED:19999:0:99999:7:::`,
    `daemon:*:18858:0:99999:7:::`,
    ``,
    `root@${target}:~# echo 'h4ck3d by oss-bot' > /var/www/html/index.html`,
    `[+] Mission complete. You are now l33t.`,
    `\`\`\``,
    `*(Totally fictional. Please don't actually do this.)*`,
  ];
}

// ── Commands ──────────────────────────────────────────────────────────────────

export const fortune: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("fortune")
    .setDescription("🔮 Print a random UNIX fortune or dev quote"),
  async execute(i: ChatInputCommandInteraction) {
    const idx = Math.floor(Math.random() * FORTUNES.length);
    const text = FORTUNES[idx] ?? FORTUNES[0]!;
    await i.reply({ 
      flags: MessageFlags.Ephemeral,
      embeds: [
        new EmbedBuilder()
          .setTitle("$ fortune | lolcat")
          .setColor(COLORS.yellow)
          .setDescription(`> ${text.replace(/\n/g, "\n> ")}`)
          .setFooter({ text: `fortune ${idx + 1}/${FORTUNES.length}` }),
      ]});
  },
};

export const cowsayCmd: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("cowsay")
    .setDescription("🐄 ASCII cow delivers your message")
    .addStringOption(o =>
      o.setName("message").setDescription("What should the cow say?").setRequired(true).setMaxLength(120)
    ) as SlashCommandBuilder,
  async execute(i: ChatInputCommandInteraction) {
    const msg = i.options.getString("message", true);
    await i.reply({
      flags: MessageFlags.Ephemeral,
      content: `\`\`\`\n${cowsay(msg)}\n\`\`\``,
    });
  },
};

export const hack: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("hack")
    .setDescription("💀 Hollywood-style hacking terminal")
    .addStringOption(o =>
      o.setName("target").setDescription("Target hostname (default: mainframe.gov)").setRequired(false).setMaxLength(40)
    ) as SlashCommandBuilder,
  async execute(i: ChatInputCommandInteraction) {
    const target = i.options.getString("target") ?? "mainframe.gov";
    await i.reply({
      flags: MessageFlags.Ephemeral,
      content: hackSequence(target).join("\n"),
    });
  },
};

export const distro: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("distro")
    .setDescription("🐧 Get a distro recommendation based on your vibe")
    .addStringOption(o =>
      o.setName("experience")
        .setDescription("Your experience level or distro use case")
        .setRequired(true)
        .addChoices(
          { name: "🌱 Beginner — just getting started",      value: "beginner" },
          { name: "💪 Power user — I live in a terminal",    value: "power"   },
          { name: "🔬 Exotic — Nix, Guix, reproducible",     value: "reproducible" },
          { name: "🏔️ Minimalist — Alpine, Void, musl",      value: "minimalist-musl" },
          { name: "🔨 Source-based — Gentoo, compile all",   value: "source-based"  },
          { name: "🏢 Enterprise — CentOS, RHEL, Ubuntu LTS", value: "enterprise-stable" },
          { name: "🔒 Security — OpenBSD, hardened",         value: "bsd-security"  },
          { name: "🐳 Container — Alpine, lightweight image", value: "container-server" },
        )
    )
    .addStringOption(o =>
      o.setName("priority")
        .setDescription("What matters most to you? (for beginner/power)")
        .setRequired(false)
        .addChoices(
          { name: "🎮 Gaming",           value: "gaming"  },
          { name: "📦 Simple & familiar", value: "simple"  },
          { name: "🔄 Rolling release",  value: "rolling" },
          { name: "🧱 Rock-solid stable", value: "stable"  },
        )
    ) as SlashCommandBuilder,
  async execute(i: ChatInputCommandInteraction) {
    const exp      = i.options.getString("experience", true);
    const priority = i.options.getString("priority") ?? "simple";

    // Handle non-beginner/power single-key distros
    const singleKey = ["reproducible","minimalist-musl","source-based","enterprise-stable","bsd-security","container-server"];
    const key = singleKey.includes(exp) ? exp : `${exp}-${priority}`;
    const rec = DISTROS[key] ?? DISTROS["beginner-simple"]!;

    await i.reply({ embeds: [
      new EmbedBuilder()
        .setTitle(`🐧 Recommended: ${rec.name}`)
        .setColor(rec.color)
        .setDescription(rec.desc)
        .addFields({ name: "🔗 Website", value: `[${rec.url}](${rec.url})` })
        .setFooter({ text: "No distro wars — all are valid. Except Windows." }),
    ]});
  },
};

export const eightball: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("🎱 Ask the kernel oracle")
    .addStringOption(o =>
      o.setName("question").setDescription("Your question").setRequired(true).setMaxLength(200)
    ) as SlashCommandBuilder,
  async execute(i: ChatInputCommandInteraction) {
    const question = i.options.getString("question", true);
    const answer   = EIGHTBALL[Math.floor(Math.random() * EIGHTBALL.length)]!;
    
    const positiveAnswers = ["Return code: 0.", "LGTM 🟢", "Compiled without warnings.", "All tests pass.", "Merge when ready.", "Segfault-free.", "`echo yes`", "The kernel approves."];
    const neutralAnswers = ["The scheduler will decide.", "Depends on your USE flags.", "Have you checked the Arch Wiki?", "Try it in a VM first.", "man page is inconclusive.", "It's in the backlog."];
    const negativeAnswers = ["Segmentation fault (core dumped).", "Permission denied.", "`rm -rf` is not the answer.", "Have you tried reading the docs?", "This is a known bug.", "Out of memory — killed.", "The answer is in the logs.", "LKML thread from 2003 disagrees.", "Works on my machine.", "Return code: 1.", "Bad file descriptor.", "Connection refused."];
    
    let color = COLORS.red;
    if (positiveAnswers.includes(answer)) {
      color = COLORS.green;
    } else if (neutralAnswers.includes(answer)) {
      color = "#FFD700"; // yellow
    }

    await i.reply({ embeds: [
      new EmbedBuilder()
        .setTitle("🎱 Kernel Oracle")
        .setColor(color)
        .addFields(
          { name: "❓ Question", value: `> ${question}` },
          { name: "🔮 Answer",   value: `\`\`\`\n${answer}\n\`\`\`` },
        )
        .setFooter({ text: "The oracle speaks only truth (results may vary)" }),
    ]});
  },
};
