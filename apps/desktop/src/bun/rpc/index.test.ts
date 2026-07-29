import { expect, mock, test } from "bun:test";

import { electrobunBunMock } from "../test-electrobun-mock";

await mock.module("electrobun/bun", () => electrobunBunMock);

const { createMainWindowRPC } = await import(".");

function createDependencies() {
  return {
    executeCommand: () => undefined,
    getMainWindow: () => ({ isFullScreen: () => true }),
    locale: {
      getLocale: () => "en-US",
      setLocale: () => Promise.resolve(),
    },
    updater: {
      getInstalledVersion: () => null,
      getUpdateModeSetting: () => "automatic",
      setUpdateModeSetting: () => Promise.resolve(),
    },
  } as never;
}

test("reports whether the main window is full screen", () => {
  const rpc = createMainWindowRPC(createDependencies()) as unknown as {
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

test("gets and persists the application locale through typed RPC", async () => {
  let currentLocale = "en-US";
  const dependencies = createDependencies() as unknown as {
    locale: {
      getLocale: () => string;
      setLocale: (locale: string) => Promise<void>;
    };
  };
  dependencies.locale = {
    getLocale: () => currentLocale,
    setLocale: (locale) => {
      currentLocale = locale;
      return Promise.resolve();
    },
  };
  const rpc = createMainWindowRPC(dependencies as never) as unknown as {
    handlers: {
      requests: {
        getLocale?: () => string;
        setLocale?: (params: { locale: string }) => Promise<null>;
      };
    };
  };

  expect(rpc.handlers.requests.getLocale?.()).toBe("en-US");
  expect(
    await rpc.handlers.requests.setLocale?.({ locale: "zh-CN" })
  ).toBeNull();
  expect(rpc.handlers.requests.getLocale?.()).toBe("zh-CN");
});
