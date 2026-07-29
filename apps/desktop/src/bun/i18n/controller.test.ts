import { describe, expect, mock, test } from "bun:test";

import {
  createLocaleController,
  type LocaleControllerDependencies,
} from "./controller";

function createDependencies(
  persistedLocale: "en-US" | "zh-CN" = "en-US"
): LocaleControllerDependencies & {
  activateLocale: ReturnType<typeof mock>;
  onLocaleChanged: ReturnType<typeof mock>;
  store: {
    getLocale: ReturnType<typeof mock>;
    setLocale: ReturnType<typeof mock>;
  };
} {
  return {
    activateLocale: mock(() => Promise.resolve()),
    onLocaleChanged: mock(() => undefined),
    store: {
      getLocale: mock(() => Promise.resolve(persistedLocale)),
      setLocale: mock(() => Promise.resolve()),
    },
  };
}

describe("locale controller", () => {
  test("activates the persisted locale before exposing it", async () => {
    const dependencies = createDependencies("zh-CN");
    const controller = createLocaleController(dependencies);

    await controller.initialize();

    expect(dependencies.activateLocale).toHaveBeenCalledWith("zh-CN");
    expect(controller.getLocale()).toBe("zh-CN");
    expect(dependencies.onLocaleChanged).not.toHaveBeenCalled();
  });

  test("persists, activates, and broadcasts a locale change in order", async () => {
    const events: string[] = [];
    const dependencies = createDependencies();
    dependencies.store.setLocale = mock((locale) => {
      events.push(`persist:${locale}`);
      return Promise.resolve();
    });
    dependencies.activateLocale = mock((locale) => {
      events.push(`activate:${locale}`);
      return Promise.resolve();
    });
    dependencies.onLocaleChanged = mock((locale) => {
      events.push(`broadcast:${locale}`);
    });
    const controller = createLocaleController(dependencies);
    await controller.initialize();
    events.length = 0;

    await controller.setLocale("zh-CN");

    expect(events).toEqual([
      "persist:zh-CN",
      "activate:zh-CN",
      "broadcast:zh-CN",
    ]);
    expect(controller.getLocale()).toBe("zh-CN");
  });

  test("rejects unsupported locales at the Bun trust boundary", async () => {
    const controller = createLocaleController(createDependencies());
    await controller.initialize();

    expect(controller.setLocale("fr-FR" as never)).rejects.toThrow(
      "Unsupported locale"
    );
  });

  test("rolls persistence and runtime back when locale activation fails", async () => {
    const events: string[] = [];
    const dependencies = createDependencies();
    dependencies.store.setLocale = mock((locale) => {
      events.push(`persist:${locale}`);
      return Promise.resolve();
    });
    dependencies.activateLocale = mock((locale) => {
      events.push(`activate:${locale}`);
      if (locale === "zh-CN") {
        return Promise.reject(new Error("activation failed"));
      }
      return Promise.resolve();
    });
    const controller = createLocaleController(dependencies);
    await controller.initialize();
    events.length = 0;

    expect(controller.setLocale("zh-CN")).rejects.toThrow("activation failed");
    expect(events).toEqual([
      "persist:zh-CN",
      "activate:zh-CN",
      "persist:en-US",
      "activate:en-US",
    ]);
    expect(controller.getLocale()).toBe("en-US");
    expect(dependencies.onLocaleChanged).not.toHaveBeenCalled();
  });

  test("serializes concurrent changes so the last requested locale wins", async () => {
    const events: string[] = [];
    let releaseFirstWrite: () => void = () => undefined;
    let firstWriteStarted: () => void = () => undefined;
    const firstWrite = new Promise<void>((resolve) => {
      firstWriteStarted = resolve;
    });
    const firstWriteGate = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve;
    });
    const dependencies = createDependencies();
    dependencies.store.setLocale = mock(async (locale) => {
      events.push(`persist:${locale}`);
      if (locale === "zh-CN") {
        firstWriteStarted();
        await firstWriteGate;
      }
    });
    dependencies.activateLocale = mock((locale) => {
      events.push(`activate:${locale}`);
      return Promise.resolve();
    });
    dependencies.onLocaleChanged = mock((locale) => {
      events.push(`broadcast:${locale}`);
    });
    const controller = createLocaleController(dependencies);
    await controller.initialize();
    events.length = 0;

    const firstChange = controller.setLocale("zh-CN");
    await firstWrite;
    const secondChange = controller.setLocale("en-US");
    releaseFirstWrite();
    await Promise.all([firstChange, secondChange]);

    expect(events).toEqual([
      "persist:zh-CN",
      "activate:zh-CN",
      "broadcast:zh-CN",
      "persist:en-US",
      "activate:en-US",
      "broadcast:en-US",
    ]);
    expect(controller.getLocale()).toBe("en-US");
  });
});
