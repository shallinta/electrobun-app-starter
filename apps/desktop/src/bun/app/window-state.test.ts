import { expect, mock, test } from "bun:test";

import type { WindowFrame } from "@shallinta/shared/server";

import { electrobunBunMock } from "../test-electrobun-mock";

await mock.module("electrobun/main", () => electrobunBunMock);

const windowStateModule = await import("./window-state");

test("provides a flushable window-state persistence controller", () => {
  expect(
    (
      windowStateModule as typeof windowStateModule & {
        createWindowStatePersistence?: unknown;
      }
    ).createWindowStatePersistence
  ).toBeFunction();
});

test("flush forces debounced frame and zoom writes through one serial queue", async () => {
  const listeners = new Map<string, () => void>();
  const frame = { x: 1, y: 2, width: 800, height: 600 };
  const win = {
    getFrame: () => frame,
    getPageZoom: () => 1,
    isFullScreen: () => false,
    isMaximized: () => false,
    on: (event: string, listener: () => void) => listeners.set(event, listener),
    setFullScreen: () => undefined,
    maximize: () => undefined,
    setPageZoom: () => undefined,
    webview: { on: () => undefined },
  };
  let finishFrame: (() => void) | undefined;
  const frameGate = new Promise<void>((resolve) => {
    finishFrame = resolve;
  });
  const events: string[] = [];
  const create = windowStateModule.createWindowStatePersistence as unknown as (
    window: typeof win,
    options: { zoom?: number },
    dependencies: {
      saveFrame: (value: WindowFrame) => Promise<void>;
      saveFullScreen: (value: boolean) => Promise<void>;
      saveMaximized: (value: boolean) => Promise<void>;
      saveZoom: (value: number) => Promise<void>;
    }
  ) => { saveZoom(zoom: number): void; flush(): Promise<void> };
  const persistence = create(
    win,
    { zoom: 1 },
    {
      saveFrame: async () => {
        events.push("frame:start");
        await frameGate;
        events.push("frame:end");
      },
      saveFullScreen: () => Promise.resolve(),
      saveMaximized: () => Promise.resolve(),
      saveZoom: (zoom) => {
        events.push(`zoom:${zoom}`);
        return Promise.resolve();
      },
    }
  );

  listeners.get("move")?.();
  persistence.saveZoom(1.25);
  const flushed = persistence.flush();
  await Promise.resolve();
  await Promise.resolve();

  expect(events).toEqual(["frame:start"]);
  finishFrame?.();
  await flushed;
  expect(events).toEqual(["frame:start", "frame:end", "zoom:1.25"]);
});

test("reports the initial full-screen state and only subsequent changes", async () => {
  const listeners = new Map<string, () => void>();
  let fullScreen = false;
  const win = {
    getFrame: () => ({ x: 1, y: 2, width: 800, height: 600 }),
    getPageZoom: () => 1,
    isFullScreen: () => fullScreen,
    isMaximized: () => false,
    on: (event: string, listener: () => void) => listeners.set(event, listener),
    setFullScreen: (value: boolean) => {
      fullScreen = value;
    },
    maximize: () => undefined,
    setPageZoom: () => undefined,
    webview: { on: () => undefined },
  };
  const observed: boolean[] = [];
  const create = windowStateModule.createWindowStatePersistence as unknown as (
    window: typeof win,
    options: { onFullScreenChange: (value: boolean) => void },
    dependencies: {
      saveFrame: (value: WindowFrame) => Promise<void>;
      saveFullScreen: (value: boolean) => Promise<void>;
      saveMaximized: (value: boolean) => Promise<void>;
      saveZoom: (value: number) => Promise<void>;
    }
  ) => { flush(): Promise<void> };
  const persistence = create(
    win,
    { onFullScreenChange: (value) => observed.push(value) },
    {
      saveFrame: () => Promise.resolve(),
      saveFullScreen: () => Promise.resolve(),
      saveMaximized: () => Promise.resolve(),
      saveZoom: () => Promise.resolve(),
    }
  );

  expect(observed).toEqual([false]);
  listeners.get("resize")?.();
  expect(observed).toEqual([false]);

  fullScreen = true;
  listeners.get("resize")?.();
  expect(observed).toEqual([false, true]);

  fullScreen = false;
  listeners.get("resize")?.();
  expect(observed).toEqual([false, true, false]);
  await persistence.flush();
});
