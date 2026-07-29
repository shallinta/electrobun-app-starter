import { readdirSync } from "node:fs";
import { join } from "node:path";

const DEV_SUFFIX = "-dev";
const PLUTIL_PATH = "/usr/bin/plutil";

interface ResolveDevDisplayNameInput {
  os?: string;
  buildEnvironment?: string;
  displayName: string;
}

export function resolveDevDisplayName({
  os,
  buildEnvironment,
  displayName,
}: ResolveDevDisplayNameInput): string | undefined {
  if (
    os !== "macos" ||
    buildEnvironment !== "dev" ||
    !displayName.endsWith(DEV_SUFFIX)
  ) {
    return undefined;
  }

  return displayName.slice(0, -DEV_SUFFIX.length);
}

function _findAppBundle(buildDir: string): string {
  const appBundles = readdirSync(buildDir)
    .filter((name) => name.endsWith(".app"))
    .sort();

  if (appBundles.length !== 1) {
    throw new Error(
      `fix-dev-display-name: expected exactly one .app bundle in ${buildDir}, found ${appBundles.length}.`
    );
  }

  return join(buildDir, appBundles[0]);
}

function _readBundleName(infoPlistPath: string): string {
  const result = Bun.spawnSync(
    [PLUTIL_PATH, "-extract", "CFBundleName", "raw", "-o", "-", infoPlistPath],
    {
      stdout: "pipe",
      stderr: "pipe",
    }
  );

  if (result.exitCode !== 0) {
    throw new Error(
      "fix-dev-display-name: could not read CFBundleName from Info.plist."
    );
  }

  const value = result.stdout.toString();
  if (value.endsWith("\r\n")) return value.slice(0, -2);
  if (value.endsWith("\n")) return value.slice(0, -1);
  return value;
}

function _writeBundleName(infoPlistPath: string, displayName: string): void {
  const result = Bun.spawnSync(
    [
      PLUTIL_PATH,
      "-replace",
      "CFBundleName",
      "-string",
      displayName,
      infoPlistPath,
    ],
    {
      stdout: "pipe",
      stderr: "pipe",
    }
  );

  if (result.exitCode !== 0) {
    throw new Error(
      "fix-dev-display-name: could not update CFBundleName in Info.plist."
    );
  }
}

function _main(): void {
  const os = process.env.ELECTROBUN_OS;
  const buildEnvironment = process.env.ELECTROBUN_BUILD_ENV;
  if (os !== "macos" || buildEnvironment !== "dev") return;

  const buildDir = process.env.ELECTROBUN_BUILD_DIR;
  if (!buildDir) {
    throw new Error(
      "fix-dev-display-name: ELECTROBUN_BUILD_DIR is required for macOS dev builds."
    );
  }

  const appBundle = _findAppBundle(buildDir);
  const infoPlistPath = join(appBundle, "Contents", "Info.plist");
  const displayName = _readBundleName(infoPlistPath);
  const correctedDisplayName = resolveDevDisplayName({
    os,
    buildEnvironment,
    displayName,
  });
  if (correctedDisplayName === undefined) return;

  _writeBundleName(infoPlistPath, correctedDisplayName);
  console.info(
    `fix-dev-display-name: changed CFBundleName to "${correctedDisplayName}".`
  );
}

if (import.meta.main) {
  try {
    _main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
