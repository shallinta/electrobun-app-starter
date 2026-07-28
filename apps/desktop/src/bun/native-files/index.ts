import { lstat as nodeLstat, stat as nodeStat } from "node:fs/promises";

import {
  assertAbsolutePath,
  buildOpenPathCommand,
  buildRevealPathCommand,
  buildTrashCommand,
} from "./commands";

export interface NativeFileDialogOptions {
  startingFolder: string;
  canChooseFiles: boolean;
  canChooseDirectory: boolean;
  allowsMultipleSelection: boolean;
}

export interface NativeFileStat {
  isDirectory(): boolean;
}

export interface NativeFileReadable {
  text(): Promise<string>;
}

export interface NativeFileProcess {
  exited: Promise<number>;
  stderr: NativeFileReadable | null;
  unref(): void;
}

export interface NativeFileSpawnOptions {
  detached?: boolean;
  stdin: "ignore";
  stdout: "ignore";
  stderr: "ignore" | "pipe";
}

export interface NativeFileDependencies {
  openFileDialog(
    options: NativeFileDialogOptions
  ): Promise<readonly string[]>;
  spawn(
    command: string[],
    options: NativeFileSpawnOptions
  ): NativeFileProcess;
  lstat(path: string): Promise<NativeFileStat>;
  stat(path: string): Promise<NativeFileStat>;
}

export interface NativeFileCapabilities {
  pickFile(): Promise<string | null>;
  pickDirectory(): Promise<string | null>;
  openPath(path: string): Promise<void>;
  revealPath(path: string): Promise<void>;
  moveToTrash(path: string): Promise<void>;
}

async function _openFileDialog(
  options: NativeFileDialogOptions
): Promise<readonly string[]> {
  const { Utils } = await import("electrobun/bun");

  return Utils.openFileDialog(options);
}

function _spawn(
  command: string[],
  options: NativeFileSpawnOptions
): NativeFileProcess {
  return Bun.spawn(command, options) as unknown as NativeFileProcess;
}

const DEFAULT_DEPENDENCIES: NativeFileDependencies = {
  openFileDialog: _openFileDialog,
  spawn: _spawn,
  lstat: (path) => nodeLstat(path),
  stat: (path) => nodeStat(path),
};

function _isMissingPathError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function _runDetached(
  dependencies: NativeFileDependencies,
  command: string[]
): void {
  const process = dependencies.spawn(command, {
    detached: true,
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
  });

  process.unref();
}

export function createNativeFileCapabilities(
  dependencies: NativeFileDependencies = DEFAULT_DEPENDENCIES
): NativeFileCapabilities {
  async function pickPath(
    options: NativeFileDialogOptions
  ): Promise<string | null> {
    const paths = await dependencies.openFileDialog(options);
    const selectedPath = paths.find((path) => path.trim().length > 0);

    if (selectedPath === undefined) {
      return null;
    }

    assertAbsolutePath(selectedPath, process.platform);
    return selectedPath;
  }

  return {
    pickFile: () =>
      pickPath({
        startingFolder: "~/",
        canChooseFiles: true,
        canChooseDirectory: false,
        allowsMultipleSelection: false,
      }),
    pickDirectory: () =>
      pickPath({
        startingFolder: "~/",
        canChooseFiles: false,
        canChooseDirectory: true,
        allowsMultipleSelection: false,
      }),
    async openPath(path) {
      assertAbsolutePath(path, process.platform);
      _runDetached(
        dependencies,
        buildOpenPathCommand(process.platform, path)
      );
      await Promise.resolve();
    },
    async revealPath(path) {
      assertAbsolutePath(path, process.platform);
      const isDirectory =
        process.platform === "darwin" || process.platform === "win32"
          ? false
          : (await dependencies.stat(path)).isDirectory();
      _runDetached(
        dependencies,
        buildRevealPathCommand(process.platform, path, isDirectory)
      );
    },
    async moveToTrash(path) {
      assertAbsolutePath(path, process.platform);

      let pathStat: NativeFileStat;
      try {
        pathStat = await dependencies.lstat(path);
      } catch (error) {
        if (_isMissingPathError(error)) {
          return;
        }
        throw error;
      }

      const childProcess = dependencies.spawn(
        buildTrashCommand(process.platform, path, pathStat.isDirectory()),
        {
          stdin: "ignore",
          stdout: "ignore",
          stderr: "pipe",
        }
      );
      let stderrConsumed: Promise<void>;
      try {
        stderrConsumed =
          childProcess.stderr?.text().then(
            () => undefined,
            () => undefined
          ) ?? Promise.resolve();
      } catch {
        stderrConsumed = Promise.resolve();
      }
      const [exitCode] = await Promise.all([
        childProcess.exited,
        stderrConsumed,
      ]);

      if (exitCode !== 0) {
        throw new Error("Failed to move item to Trash.");
      }
    },
  };
}
