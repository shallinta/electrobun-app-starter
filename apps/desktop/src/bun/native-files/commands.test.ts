import { describe, expect, test } from "bun:test";

import {
  assertAbsolutePath,
  buildOpenPathCommand,
  buildRevealPathCommand,
  buildTrashCommand,
} from "./commands";

describe("assertAbsolutePath", () => {
  test("rejects empty and relative paths without including their value", () => {
    expect(() => assertAbsolutePath("")).toThrow("An absolute path is required.");

    const sensitiveRelativePath = "private/customer-name.txt";

    try {
      assertAbsolutePath(sensitiveRelativePath);
      throw new Error("Expected relative path validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("An absolute path is required.");
      expect((error as Error).message).not.toContain(sensitiveRelativePath);
    }
  });

  test("rejects absolute paths from a different platform without exposing them", () => {
    const mismatches: [NodeJS.Platform, string][] = [
      ["darwin", "C:\\Users\\private\\report.txt"],
      ["linux", "C:\\Users\\private\\report.txt"],
      ["win32", "/tmp/private/report.txt"],
    ];

    for (const [platform, sensitivePath] of mismatches) {
      try {
        assertAbsolutePath(sensitivePath, platform);
        throw new Error("Expected cross-platform path validation to fail.");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("An absolute path is required.");
        expect((error as Error).message).not.toContain(sensitivePath);
      }
    }
  });
});

describe("buildOpenPathCommand", () => {
  test("builds the native opener for each platform", () => {
    expect(buildOpenPathCommand("darwin", "/tmp/report.txt")).toEqual([
      "open",
      "/tmp/report.txt",
    ]);
    expect(buildOpenPathCommand("win32", "C:\\Users\\report.txt")).toEqual([
      "explorer.exe",
      "C:\\Users\\report.txt",
    ]);
    expect(buildOpenPathCommand("linux", "/tmp/report.txt")).toEqual([
      "xdg-open",
      "/tmp/report.txt",
    ]);
  });

  test("validates paths against the requested platform", () => {
    expect(() =>
      buildOpenPathCommand("linux", "C:\\Users\\private\\report.txt")
    ).toThrow("An absolute path is required.");
    expect(() =>
      buildRevealPathCommand("win32", "/tmp/private/report.txt", false)
    ).toThrow("An absolute path is required.");
    expect(() =>
      buildTrashCommand("darwin", "C:\\Users\\private\\report.txt", false)
    ).toThrow("An absolute path is required.");
  });
});

describe("buildRevealPathCommand", () => {
  test("builds reveal commands for macOS and Windows", () => {
    expect(
      buildRevealPathCommand("darwin", "/tmp/report.txt", false)
    ).toEqual(["open", "-R", "/tmp/report.txt"]);
    expect(
      buildRevealPathCommand("win32", "C:\\Users\\report.txt", false)
    ).toEqual(["explorer.exe", "/select,C:\\Users\\report.txt"]);
  });

  test("opens a Linux directory or the parent of a Linux file", () => {
    expect(buildRevealPathCommand("linux", "/tmp/reports", true)).toEqual([
      "xdg-open",
      "/tmp/reports",
    ]);
    expect(
      buildRevealPathCommand("linux", "/tmp/reports/today.txt", false)
    ).toEqual(["xdg-open", "/tmp/reports"]);
  });
});

describe("buildTrashCommand", () => {
  test("uses recoverable platform trash commands", () => {
    expect(buildTrashCommand("linux", "/tmp/report.txt", false)).toEqual([
      "gio",
      "trash",
      "/tmp/report.txt",
    ]);

    const macPath = '/tmp/report "final".txt';
    expect(buildTrashCommand("darwin", macPath, false)).toEqual([
      "osascript",
      "-e",
      `tell application "Finder" to delete POSIX file ${JSON.stringify(macPath)}`,
    ]);
  });

  test("escapes PowerShell single quotes and selects the right delete method", () => {
    const fileCommand = buildTrashCommand(
      "win32",
      "C:\\Users\\O'Brien\\report.txt",
      false
    );
    const directoryCommand = buildTrashCommand(
      "win32",
      "C:\\Users\\O'Brien\\reports",
      true
    );

    expect(fileCommand.slice(0, 4)).toEqual([
      "powershell.exe",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
    ]);
    expect(fileCommand[4]).toContain("::DeleteFile(");
    expect(fileCommand[4]).toContain("O''Brien");
    expect(directoryCommand[4]).toContain("::DeleteDirectory(");
    expect(directoryCommand[4]).toContain("O''Brien");
  });
});
