import { describe, expect, test } from "bun:test";

import { resolveMacRendererConfig } from "./renderer";

describe("resolveMacRendererConfig", () => {
  test("keeps the system renderer even when a CDP port is provided", () => {
    expect(
      resolveMacRendererConfig({
        renderer: "system",
        cdpPort: "9222",
      })
    ).toEqual({
      bundleCEF: false,
    });
  });

  test("enables CEF without Chromium flags when no CDP port is provided", () => {
    expect(resolveMacRendererConfig({ renderer: "cef" })).toEqual({
      bundleCEF: true,
      defaultRenderer: "cef",
    });
  });

  test("enables local-only CDP access for CEF", () => {
    expect(
      resolveMacRendererConfig({
        renderer: "cef",
        cdpPort: "9222",
      })
    ).toEqual({
      bundleCEF: true,
      defaultRenderer: "cef",
      chromiumFlags: {
        "remote-debugging-address": "127.0.0.1",
        "remote-debugging-port": "9222",
      },
    });
  });

  test("treats an empty CDP environment variable as unset", () => {
    expect(
      resolveMacRendererConfig({
        renderer: "cef",
        cdpPort: "",
      })
    ).toEqual({
      bundleCEF: true,
      defaultRenderer: "cef",
    });
  });

  test.each(["0", "65536", "1.5", " 9222", "9222 ", "not-a-port"])(
    "rejects invalid CEF CDP port input without echoing it: %s",
    (cdpPort) => {
      expect(() =>
        resolveMacRendererConfig({
          renderer: "cef",
          cdpPort,
        })
      ).toThrow("Invalid CDP port.");

      try {
        resolveMacRendererConfig({
          renderer: "cef",
          cdpPort,
        });
      } catch (error) {
        expect(String(error)).not.toContain(cdpPort);
      }
    }
  );
});
