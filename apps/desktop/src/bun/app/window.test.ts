import { expect, mock, test } from "bun:test";

import {
  browserWindowListeners,
  electrobunBunMock,
  fakeBrowserWindow,
  resetFakeBrowserWindow,
  setFakeBrowserWindowFullScreen,
} from "../test-electrobun-mock";

await mock.module("electrobun/bun", () => electrobunBunMock);

const { createMainWindow } = await import("./window");

test("creates a managed window whose pending state can be flushed", async () => {
  resetFakeBrowserWindow();
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

test("reports the created window before the initial full-screen state", async () => {
  resetFakeBrowserWindow();
  const events: string[] = [];
  let createdWindow: unknown;

  await createMainWindow({
    rpc: {} as never,
    executeCommand: () => undefined,
    onWindowCreated: (window: unknown) => {
      createdWindow = window;
      events.push("window-created");
    },
    onFullScreenChange: () => events.push("full-screen-change"),
  });

  expect(createdWindow).toBe(fakeBrowserWindow);
  expect(events).toEqual(["window-created", "full-screen-change"]);
});

test("forwards observed full-screen changes", async () => {
  resetFakeBrowserWindow();
  const observed: boolean[] = [];

  await createMainWindow({
    rpc: {} as never,
    executeCommand: () => undefined,
    onFullScreenChange: (fullScreen: boolean) => observed.push(fullScreen),
  });

  expect(observed).toEqual([false]);
  setFakeBrowserWindowFullScreen(true);
  browserWindowListeners.get("resize")?.();
  expect(observed).toEqual([false, true]);
});
