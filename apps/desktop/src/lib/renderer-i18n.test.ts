import { expect, mock, test } from "bun:test";

import * as rendererI18nModule from "./renderer-i18n";
import type { LocaleRPC } from "./renderer-i18n";

const { createRendererI18nRuntime } = rendererI18nModule;

function createDocumentRoot() {
  const attributes = new Map<string, string>();
  return {
    attributes,
    root: {
      setAttribute: (name: string, value: string) =>
        attributes.set(name, value),
    },
  };
}

test("loads the Bun locale before the renderer runtime becomes ready", async () => {
  const events: string[] = [];
  let localeListener: (message: { locale: "en-US" | "zh-CN" }) => void = () =>
    undefined;
  const rpc: LocaleRPC = {
    addMessageListener: (_name, listener) => {
      events.push("listen");
      localeListener = listener;
    },
    request: {
      getLocale: () => {
        events.push("request");
        return Promise.resolve("zh-CN");
      },
      setLocale: () => Promise.resolve(null),
    },
  };
  const { attributes, root } = createDocumentRoot();
  const runtime = createRendererI18nRuntime({ documentRoot: root, rpc });

  await runtime.initialize();

  expect(events).toEqual(["listen", "request"]);
  expect(runtime.getLocale()).toBe("zh-CN");
  expect(runtime.t("settings:language.title")).toBe("语言");
  expect(attributes.get("lang")).toBe("zh-CN");
  expect(attributes.get("dir")).toBe("ltr");

  localeListener({ locale: "en-US" });
  await Bun.sleep(0);
  expect(runtime.getLocale()).toBe("en-US");
  expect(attributes.get("lang")).toBe("en-US");
});

test("asks Bun to persist language changes instead of mutating local state", async () => {
  const setLocale = mock(() => Promise.resolve(null));
  const rpc: LocaleRPC = {
    addMessageListener: () => undefined,
    request: {
      getLocale: () => Promise.resolve("en-US"),
      setLocale,
    },
  };
  const runtime = createRendererI18nRuntime({
    documentRoot: createDocumentRoot().root,
    rpc,
  });
  await runtime.initialize();

  await runtime.setLocale("zh-CN");

  expect(setLocale).toHaveBeenCalledWith({ locale: "zh-CN" });
  expect(runtime.getLocale()).toBe("en-US");
});

test("applies a newer Bun locale received while i18next is initializing", async () => {
  let localeListener: (message: { locale: "en-US" | "zh-CN" }) => void = () =>
    undefined;
  let finishInitialization: () => void = () => undefined;
  let initializationStarted = false;
  const fakeI18n = {
    resolvedLanguage: undefined as string | undefined,
    use() {
      return this;
    },
    init: async ({ lng }: { lng: string }) => {
      initializationStarted = true;
      fakeI18n.resolvedLanguage = lng;
      await new Promise<void>((resolve) => {
        finishInitialization = resolve;
      });
    },
    changeLanguage: (locale: string) => {
      fakeI18n.resolvedLanguage = locale;
      return Promise.resolve();
    },
    dir: () => "ltr" as const,
    t: (key: string) => key,
  };
  const rpc: LocaleRPC = {
    addMessageListener: (_name, listener) => {
      localeListener = listener;
    },
    request: {
      getLocale: () => Promise.resolve("en-US"),
      setLocale: () => Promise.resolve(null),
    },
  };
  const runtime = createRendererI18nRuntime({
    documentRoot: createDocumentRoot().root,
    i18n: fakeI18n,
    rpc,
  } as never);

  const initialization = runtime.initialize();
  await Bun.sleep(0);
  expect(initializationStarted).toBe(true);
  localeListener({ locale: "zh-CN" });
  finishInitialization();
  await initialization;

  expect(runtime.getLocale()).toBe("zh-CN");
});

test("recovers the locale queue after one renderer activation fails", async () => {
  let localeListener: (message: { locale: "en-US" | "zh-CN" }) => void = () =>
    undefined;
  let activationAttempts = 0;
  const activationError = new Error("activation failed");
  const errors: unknown[] = [];
  const fakeI18n = {
    resolvedLanguage: undefined as string | undefined,
    init: ({ lng }: { lng: string }) => {
      fakeI18n.resolvedLanguage = lng;
      return Promise.resolve();
    },
    changeLanguage: (locale: string) => {
      activationAttempts += 1;
      if (activationAttempts === 1) return Promise.reject(activationError);
      fakeI18n.resolvedLanguage = locale;
      return Promise.resolve();
    },
    dir: () => "ltr" as const,
    t: (key: string) => key,
  };
  const rpc: LocaleRPC = {
    addMessageListener: (_name, listener) => {
      localeListener = listener;
    },
    request: {
      getLocale: () => Promise.resolve("en-US"),
      setLocale: () => Promise.resolve(null),
    },
  };
  const runtime = createRendererI18nRuntime({
    documentRoot: createDocumentRoot().root,
    i18n: fakeI18n,
    onError: (error: unknown) => errors.push(error),
    rpc,
  } as never);
  await runtime.initialize();

  localeListener({ locale: "zh-CN" });
  await Bun.sleep(0);
  localeListener({ locale: "zh-CN" });
  await Bun.sleep(0);

  expect(errors).toEqual([activationError]);
  expect(activationAttempts).toBe(2);
  expect(runtime.getLocale()).toBe("zh-CN");
});

test("exposes the stable original i18n instance across language changes", async () => {
  const getStableRendererI18n = (
    rendererI18nModule as typeof rendererI18nModule & {
      getStableRendererI18n?: () => unknown;
    }
  ).getStableRendererI18n;
  expect(getStableRendererI18n).toBeFunction();
  if (!getStableRendererI18n) return;

  let localeListener: (message: { locale: "en-US" | "zh-CN" }) => void = () =>
    undefined;
  const rpc: LocaleRPC = {
    addMessageListener: (_name, listener) => {
      localeListener = listener;
    },
    request: {
      getLocale: () => Promise.resolve("en-US"),
      setLocale: () => Promise.resolve(null),
    },
  };
  const runtime = createRendererI18nRuntime({
    documentRoot: createDocumentRoot().root,
    rpc,
  });
  await runtime.initialize();
  const stableInstance = getStableRendererI18n();

  localeListener({ locale: "zh-CN" });
  await Bun.sleep(0);

  expect(getStableRendererI18n()).toBe(stableInstance);
});

test("renders a recoverable startup failure when locale initialization rejects", async () => {
  const bootstrapRenderer = (
    rendererI18nModule as typeof rendererI18nModule & {
      bootstrapRenderer?: (dependencies: {
        initialize: () => Promise<void>;
        renderApp: () => void;
        renderFailure: (error: unknown) => void;
      }) => Promise<void>;
    }
  ).bootstrapRenderer;
  expect(bootstrapRenderer).toBeFunction();
  if (!bootstrapRenderer) return;

  const error = new Error("locale RPC timed out");
  const renderApp = mock(() => undefined);
  const renderFailure = mock(() => undefined);

  await bootstrapRenderer({
    initialize: () => Promise.reject(error),
    renderApp,
    renderFailure,
  });

  expect(renderApp).not.toHaveBeenCalled();
  expect(renderFailure).toHaveBeenCalledWith(error);
});
