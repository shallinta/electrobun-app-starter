import { describe, expect, test } from "bun:test";

import { resolveDevDisplayName } from "./fix-dev-display-name";

describe("resolveDevDisplayName", () => {
  test("removes the trailing development suffix for a macOS dev build", () => {
    expect(
      resolveDevDisplayName({
        os: "macos",
        buildEnvironment: "dev",
        displayName: "Electrobun App Starter-dev",
      })
    ).toBe("Electrobun App Starter");
  });

  test("only removes a suffix at the end of the display name", () => {
    expect(
      resolveDevDisplayName({
        os: "macos",
        buildEnvironment: "dev",
        displayName: "Electrobun-dev App Starter",
      })
    ).toBeUndefined();
  });

  test.each([
    ["linux", "dev"],
    ["windows", "dev"],
    ["macos", "canary"],
    ["macos", "stable"],
  ])("does nothing for %s %s builds", (os, buildEnvironment) => {
    expect(
      resolveDevDisplayName({
        os,
        buildEnvironment,
        displayName: "Electrobun App Starter-dev",
      })
    ).toBeUndefined();
  });

  test("does nothing when Electrobun no longer appends the suffix", () => {
    expect(
      resolveDevDisplayName({
        os: "macos",
        buildEnvironment: "dev",
        displayName: "Electrobun App Starter",
      })
    ).toBeUndefined();
  });
});
