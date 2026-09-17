// Structured JSON logging to stdout/stderr - shows up in `docker compose
// logs app` (or any log collector pointed at the container) with a
// consistent, greppable shape instead of ad-hoc console.log strings.
//
// This is intentionally dependency-free. If you wire up an external
// service later (Sentry, Axiom, Better Stack, ...), this is the one place
// to also forward `error()` calls to it.

type LogContext = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, context?: LogContext) {
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, error?: unknown, context?: LogContext) => {
    const errorDetails =
      error instanceof Error
        ? { errorMessage: error.message, stack: error.stack }
        : error != null
          ? { errorMessage: String(error) }
          : {};
    write("error", message, { ...errorDetails, ...context });
  },
};
