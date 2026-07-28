import { describe, expect, mock, spyOn, test } from "bun:test";

import { electrobunBunMock } from "./test-electrobun-mock";

await mock.module("electrobun/bun", () => electrobunBunMock);

const { executeCommandInBun } = await import("./commands");

function createDependencies(openedUrls: string[]) {
  return {
    openExternal: (url: string) => openedUrls.push(url),
    saveZoom: () => undefined,
    sendToWebview: () => undefined,
    updater: {
      applyUpdateAndRestart: () => Promise.resolve(),
      checkForUpdates: () => Promise.resolve(),
    },
  };
}

describe("executeCommandInBun openLink", () => {
  test.each(["http://example.com/path", "https://example.com/path"])(
    "opens allowed URL %s",
    (url) => {
      const openedUrls: string[] = [];

      executeCommandInBun(
        { type: "openLink", args: { url } },
        {} as never,
        createDependencies(openedUrls)
      );

      expect(openedUrls).toEqual([url]);
    }
  );

  test.each([
    "not a URL",
    "file:///tmp/private.txt",
    "javascript:alert(1)",
    "custom-app://open/secret",
    "//example.com/path",
  ])("does not open or disclose rejected URL %s", (url) => {
    const openedUrls: string[] = [];
    const error = spyOn(console, "error").mockImplementation(() => undefined);

    try {
      executeCommandInBun(
        { type: "openLink", args: { url } },
        {} as never,
        createDependencies(openedUrls)
      );

      expect(openedUrls).toEqual([]);
      expect(error).toHaveBeenCalledWith("Blocked unsafe external URL.");
      expect(error.mock.calls.flat().join(" ")).not.toContain(url);
    } finally {
      error.mockRestore();
    }
  });
});

describe("executeCommandInBun toggleMaximized", () => {
  test("maximizes a restored window", () => {
    let maximized = false;
    const window = {
      isMaximized: () => maximized,
      maximize: () => {
        maximized = true;
      },
      unmaximize: () => {
        maximized = false;
      },
    };

    executeCommandInBun(
      { type: "toggleMaximized", args: {} },
      window as never,
      createDependencies([])
    );

    expect(maximized).toBe(true);
  });

  test("restores a maximized window", () => {
    let maximized = true;
    const window = {
      isMaximized: () => maximized,
      maximize: () => {
        maximized = true;
      },
      unmaximize: () => {
        maximized = false;
      },
    };

    executeCommandInBun(
      { type: "toggleMaximized", args: {} },
      window as never,
      createDependencies([])
    );

    expect(maximized).toBe(false);
  });
});
