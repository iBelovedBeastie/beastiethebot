// ── Lightweight logger — no heavy deps, Railway-friendly ─────────────────────
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

const configured = (process.env["LOG_LEVEL"] ?? "info") as Level;
const minLevel = LEVELS[configured] ?? LEVELS.info;

function ts(): string {
  return new Date().toISOString();
}

function fmt(level: Level, tag: string, msg: string): string {
  const icons: Record<Level, string> = {
    debug: "·",
    info:  "+",
    warn:  "!",
    error: "✗",
  };
  return `[${ts()}] [${icons[level]}] [${tag}] ${msg}`;
}

export const logger = {
  debug: (tag: string, msg: string) => {
    if (LEVELS.debug >= minLevel) console.debug(fmt("debug", tag, msg));
  },
  info: (tag: string, msg: string) => {
    if (LEVELS.info >= minLevel) console.log(fmt("info", tag, msg));
  },
  warn: (tag: string, msg: string) => {
    if (LEVELS.warn >= minLevel) console.warn(fmt("warn", tag, msg));
  },
  error: (tag: string, msg: string, err?: unknown) => {
    console.error(fmt("error", tag, msg));
    if (err) console.error(err);
  },
};
