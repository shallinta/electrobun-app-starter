import os from "node:os";
import path from "node:path";

/** Root directory for application user data. */
export function getAppHomePath(): string {
  return (
    process.env.ELECTROBUN_APP_STARTER_HOME ??
    path.join(os.homedir(), ".electrobun-app-starter")
  );
}

/** Directory holding persisted settings. */
export function getSettingsDir(): string {
  return path.join(getAppHomePath(), "settings");
}

export function getWindowStatePath(): string {
  return path.join(getSettingsDir(), "window.json");
}

export function expandHomePath(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}
