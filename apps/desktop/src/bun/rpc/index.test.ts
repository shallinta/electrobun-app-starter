import { expect, mock, test } from "bun:test";

import { electrobunBunMock } from "../test-electrobun-mock";

await mock.module("electrobun/bun", () => electrobunBunMock);

const { createMainWindowRPC } = await import(".");

test("reports whether the main window is full screen", () => {
  const rpc = createMainWindowRPC({
    executeCommand: () => undefined,
    getMainWindow: () => ({ isFullScreen: () => true }),
    updater: {
      getInstalledVersion: () => null,
      getUpdateModeSetting: () => "automatic",
      setUpdateModeSetting: () => Promise.resolve(),
    },
  } as never) as unknown as {
    handlers: {
      requests: {
        isFullScreen?: () => { fullScreen: boolean };
      };
    };
  };
  const handler = rpc.handlers.requests.isFullScreen;

  expect(handler).toBeFunction();
  expect(handler?.()).toEqual({ fullScreen: true });
});
