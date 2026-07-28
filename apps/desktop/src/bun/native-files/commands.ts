import path from "node:path";

const ABSOLUTE_PATH_ERROR = "An absolute path is required.";

export function assertAbsolutePath(
  value: string,
  platform: NodeJS.Platform = process.platform
): void {
  const isAbsolute =
    platform === "win32"
      ? path.win32.isAbsolute(value) && !path.posix.isAbsolute(value)
      : path.posix.isAbsolute(value);

  if (value.length === 0 || !isAbsolute) {
    throw new Error(ABSOLUTE_PATH_ERROR);
  }
}

export function buildOpenPathCommand(
  platform: NodeJS.Platform,
  absolutePath: string
): string[] {
  assertAbsolutePath(absolutePath, platform);

  if (platform === "darwin") {
    return ["open", absolutePath];
  }

  if (platform === "win32") {
    return ["explorer.exe", absolutePath];
  }

  return ["xdg-open", absolutePath];
}

export function buildRevealPathCommand(
  platform: NodeJS.Platform,
  absolutePath: string,
  isDirectory: boolean
): string[] {
  assertAbsolutePath(absolutePath, platform);

  if (platform === "darwin") {
    return ["open", "-R", absolutePath];
  }

  if (platform === "win32") {
    return ["explorer.exe", `/select,${absolutePath}`];
  }

  return ["xdg-open", isDirectory ? absolutePath : path.dirname(absolutePath)];
}

export function buildTrashCommand(
  platform: NodeJS.Platform,
  absolutePath: string,
  isDirectory: boolean
): string[] {
  assertAbsolutePath(absolutePath, platform);

  if (platform === "darwin") {
    return [
      "osascript",
      "-e",
      `tell application "Finder" to delete POSIX file ${JSON.stringify(
        absolutePath
      )}`,
    ];
  }

  if (platform === "win32") {
    const escapedPath = absolutePath.split("'").join("''");
    const deleteMethod = isDirectory ? "DeleteDirectory" : "DeleteFile";
    const script =
      "Add-Type -AssemblyName Microsoft.VisualBasic; " +
      `[Microsoft.VisualBasic.FileIO.FileSystem]::${deleteMethod}(` +
      `'${escapedPath}', ` +
      "[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, " +
      "[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)";

    return [
      "powershell.exe",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      script,
    ];
  }

  return ["gio", "trash", absolutePath];
}
