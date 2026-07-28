import { expect, mock, test } from "bun:test";

import { electrobunBunMock, fakeBrowserWindow } from "../test-electrobun-mock";

await mock.module("electrobun/bun", () => electrobunBunMock);

const { createMainWindow } = await import("./window");

test("creates a managed window whose pending state can be flushed", async () => {
  const managedWindow = (await createMainWindow({
    rpc: {} as never,
    executeCommand: () => undefined,
  })) as unknown as {
    window?: unknown;
    saveZoom?: unknown;
    flushState?: unknown;
  };

  expect(managedWindow.window).toBe(fakeBrowserWindow);
  expect(managedWindow.saveZoom).toBeFunction();
  expect(managedWindow.flushState).toBeFunction();
});
