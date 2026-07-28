import { describe, expect, test } from "bun:test";

import {
  createNativeFileCapabilities,
  type NativeFileDependencies,
  type NativeFileDialogOptions,
  type NativeFileProcess,
  type NativeFileSpawnOptions,
} from "./index";

interface RecordedSpawn {
  command: string[];
  options: NativeFileSpawnOptions;
  process: TestProcess;
}

interface TestProcess extends NativeFileProcess {
  unrefCalls: number;
}

function createProcess(
  exitCode = 0,
  stderrText = ""
): TestProcess {
  return {
    exited: Promise.resolve(exitCode),
    stderr: {
      text: () => Promise.resolve(stderrText),
    },
    unrefCalls: 0,
    unref() {
      this.unrefCalls += 1;
    },
  };
}

function createDependencies(
  overrides: Partial<NativeFileDependencies> = {}
): {
  dependencies: NativeFileDependencies;
  dialogs: NativeFileDialogOptions[];
  spawns: RecordedSpawn[];
} {
  const dialogs: NativeFileDialogOptions[] = [];
  const spawns: RecordedSpawn[] = [];

  return {
    dialogs,
    spawns,
    dependencies: {
      openFileDialog: (options) => {
        dialogs.push(options);
        return Promise.resolve([]);
      },
      spawn: (command, options) => {
        const process = createProcess();
        spawns.push({ command, options, process });
        return process;
      },
      lstat: () => Promise.resolve({ isDirectory: () => false }),
      stat: () => Promise.resolve({ isDirectory: () => false }),
      ...overrides,
    },
  };
}

describe("native file pickers", () => {
  test("uses single-selection file and directory picker options", async () => {
    const setup = createDependencies({
      openFileDialog: () =>
        Promise.resolve(["  ", "/tmp/selected-file.txt ", "/tmp/ignored.txt"]),
    });
    const capabilities = createNativeFileCapabilities(setup.dependencies);

    expect(await capabilities.pickFile()).toBe("/tmp/selected-file.txt ");
    expect(await capabilities.pickDirectory()).toBe("/tmp/selected-file.txt ");
    expect(setup.dialogs).toEqual([]);
  });

  test("passes exact picker options and returns null for cancellation or blanks", async () => {
    const results = [[], ["", "   "]];
    const setup = createDependencies({
      openFileDialog: (options) => {
        setup.dialogs.push(options);
        return Promise.resolve(results.shift() ?? []);
      },
    });
    const capabilities = createNativeFileCapabilities(setup.dependencies);

    expect(await capabilities.pickFile()).toBeNull();
    expect(await capabilities.pickDirectory()).toBeNull();
    expect(setup.dialogs).toEqual([
      {
        startingFolder: "~/",
        canChooseFiles: true,
        canChooseDirectory: false,
        allowsMultipleSelection: false,
      },
      {
        startingFolder: "~/",
        canChooseFiles: false,
        canChooseDirectory: true,
        allowsMultipleSelection: false,
      },
    ]);
  });

  test("rejects an unexpected relative selection without exposing it", async () => {
    const sensitiveRelativePath = "customers/acme/private.txt";
    const setup = createDependencies({
      openFileDialog: () => Promise.resolve([sensitiveRelativePath]),
    });
    const capabilities = createNativeFileCapabilities(setup.dependencies);

    try {
      await capabilities.pickFile();
      throw new Error("Expected picker path validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(sensitiveRelativePath);
    }
  });
});

describe("native path actions", () => {
  test("opens and reveals with detached ignored-stdio processes", async () => {
    const setup = createDependencies();
    const capabilities = createNativeFileCapabilities(setup.dependencies);

    await capabilities.openPath("/tmp/report.txt");
    await capabilities.revealPath("/tmp/report.txt");

    expect(setup.spawns).toHaveLength(2);
    for (const spawn of setup.spawns) {
      expect(spawn.options).toEqual({
        detached: true,
        stdin: "ignore",
        stdout: "ignore",
        stderr: "ignore",
      });
      expect(spawn.process.unrefCalls).toBe(1);
    }
  });

  test("rejects relative paths before spawning", async () => {
    const setup = createDependencies();
    const capabilities = createNativeFileCapabilities(setup.dependencies);

    let openError: unknown;
    let revealError: unknown;
    try {
      await capabilities.openPath("relative.txt");
    } catch (error) {
      openError = error;
    }
    try {
      await capabilities.revealPath("relative.txt");
    } catch (error) {
      revealError = error;
    }

    expect((openError as Error).message).toBe("An absolute path is required.");
    expect((revealError as Error).message).toBe("An absolute path is required.");
    expect(setup.spawns).toHaveLength(0);
  });
});

describe("moveToTrash", () => {
  test("does nothing when the path is already missing", async () => {
    let spawnCalls = 0;
    const setup = createDependencies({
      lstat: () =>
        Promise.reject(Object.assign(new Error("missing"), { code: "ENOENT" })),
      spawn: () => {
        spawnCalls += 1;
        return createProcess();
      },
    });
    const capabilities = createNativeFileCapabilities(setup.dependencies);

    await capabilities.moveToTrash("/tmp/already-gone.txt");

    expect(spawnCalls).toBe(0);
  });

  test("starts consuming stderr before the trash process exits", async () => {
    let resolveExit: (exitCode: number) => void = () => undefined;
    const exited = new Promise<number>((resolve) => {
      resolveExit = resolve;
    });
    let stderrStarted = false;
    const deferredProcess: TestProcess = {
      exited,
      stderr: {
        text: () => {
          stderrStarted = true;
          return Promise.resolve("");
        },
      },
      unrefCalls: 0,
      unref() {
        this.unrefCalls += 1;
      },
    };
    const setup = createDependencies({
      spawn: (command, options) => {
        setup.spawns.push({ command, options, process: deferredProcess });
        return deferredProcess;
      },
    });
    const capabilities = createNativeFileCapabilities(setup.dependencies);

    const trashPromise = capabilities.moveToTrash("/tmp/report.txt");
    await Promise.resolve();

    expect(stderrStarted).toBeTrue();
    resolveExit(0);
    await trashPromise;
  });

  test("awaits trash and reports nonzero exit without exposing stderr or path", async () => {
    const sensitivePath = "/tmp/customer-acme-private.txt";
    const sensitiveStderr = `failed to trash ${sensitivePath}`;
    let stderrReads = 0;
    const failedProcess = createProcess(9);
    failedProcess.stderr = {
      text: () => {
        stderrReads += 1;
        return Promise.resolve(sensitiveStderr);
      },
    };
    const setup = createDependencies({
      spawn: (command, options) => {
        setup.spawns.push({ command, options, process: failedProcess });
        return failedProcess;
      },
    });
    const capabilities = createNativeFileCapabilities(setup.dependencies);

    try {
      await capabilities.moveToTrash(sensitivePath);
      throw new Error("Expected trash failure.");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Failed to move item to Trash.");
      expect((error as Error).message).not.toContain(sensitivePath);
      expect((error as Error).message).not.toContain(sensitiveStderr);
    }
    expect(stderrReads).toBe(1);
    expect(setup.spawns[0]?.options).toEqual({
      stdin: "ignore",
      stdout: "ignore",
      stderr: "pipe",
    });
  });
});
