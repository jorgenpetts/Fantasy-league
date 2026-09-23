import { env } from "../config/env.js";

type LogLevel = "info" | "warn" | "error" | "debug";
type LogDetails = Record<string, unknown>;

function shouldLog(level: LogLevel) {
  if (env.LOG_LEVEL === "silent") {
    return false;
  }

  if (level === "debug") {
    return env.LOG_LEVEL === "debug";
  }

  return true;
}

function write(level: LogLevel, message: string, details?: LogDetails) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...details,
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info: (message: string, details?: LogDetails) => write("info", message, details),
  warn: (message: string, details?: LogDetails) => write("warn", message, details),
  error: (message: string, details?: LogDetails) =>
    write("error", message, details),
  debug: (message: string, details?: LogDetails) =>
    write("debug", message, details),
};
