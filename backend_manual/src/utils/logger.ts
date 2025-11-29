/**
 * Simple Logger Utility
 * Provides consistent logging across the application
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_COLORS = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m",  // Green
  warn: "\x1b[33m",  // Yellow
  error: "\x1b[31m", // Red
  reset: "\x1b[0m",
};

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  const color = LOG_COLORS[level];
  const reset = LOG_COLORS.reset;
  return `${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}`;
}

export const logger = {
  debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === "development" || process.env.DEBUG) {
      console.log(formatMessage("debug", message));
      if (data) console.log(data);
    }
  },

  info(message: string, data?: unknown): void {
    console.log(formatMessage("info", message));
    if (data) console.log(data);
  },

  warn(message: string, data?: unknown): void {
    console.warn(formatMessage("warn", message));
    if (data) console.warn(data);
  },

  error(message: string, error?: unknown): void {
    console.error(formatMessage("error", message));
    if (error) {
      if (error instanceof Error) {
        console.error(error.message);
        if (process.env.NODE_ENV === "development") {
          console.error(error.stack);
        }
      } else {
        console.error(error);
      }
    }
  },
};

