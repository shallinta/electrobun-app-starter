import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

import type { UpdateMode } from "../../shared/updates";
import {
  electrobunBunMock,
  fakeUpdater as nativeUpdater,
} from "../test-electrobun-mock";

await mock.module("electrobun/bun", () => electrobunBunMock);

const { UpdaterService } = await import("./index");

interface TestDependencies {
  updater: typeof nativeUpdater;
  getLastSeenHash: (identifier: string) => Promise<string | undefined>;
  getUpdateMode: () => Promise<UpdateMode>;
  persistUpdateMode: (mode: UpdateMode) => Promise<void>;
  setLastSeenHash: (identifier: string, hash: string) => Promise<void>;
  setUpdateModeInMenu: (mode: UpdateMode) => void;
  setUpdateReadyInMenu: (version: string | null) => void;
  setTimeout: (callback: () => void, delay: number) => unknown;
  clearTimeout: (timer: unknown) => void;
  setInterval: (callback: () => void, delay: number) => unknown;
  clearInterval: (timer: unknown) => void;
}

function createDependencies(
  overrides: Partial<TestDependencies> = {}
): TestDependencies {
  return {
    updater: nativeUpdater,
    getLastSeenHash: () => Promise.resolve(undefined),
    getUpdateMode: () => Promise.resolve("automatic"),
    persistUpdateMode: () => Promise.resolve(),
    setLastSeenHash: () => Promise.resolve(),
    setUpdateModeInMenu: () => undefined,
    setUpdateReadyInMenu: () => undefined,
    setTimeout: () => ({ kind: "timeout" }),
    clearTimeout: () => undefined,
    setInterval: () => ({ kind: "interval" }),
    clearInterval: () => undefined,
    ...overrides,
  };
}

function createService(
  dependencies: TestDependencies = createDependencies()
): InstanceType<typeof UpdaterService> {
  const Constructor = UpdaterService as unknown as new (
    sendStatus: () => void,
    dependencies: TestDependencies
  ) => InstanceType<typeof UpdaterService>;
  return new Constructor(() => undefined, dependencies);
}

beforeEach(() => {
  nativeUpdater.applyUpdate = () => Promise.resolve();
  nativeUpdater.checkForUpdate = () =>
    Promise.resolve({
      error: null,
      updateAvailable: false,
      version: "1.0.0",
    });
  nativeUpdater.getLocalInfo = () =>
    Promise.resolve({
      channel: "stable",
      hash: "hash",
      identifier: "app.test",
      version: "1.0.0",
    });
});

describe("UpdaterService", () => {
  test("never checks for updates in off mode, including manual requests", async () => {
    let checks = 0;
    const checkForUpdate = () => {
      checks += 1;
      return Promise.resolve({
        error: null,
        updateAvailable: false,
        version: "1.0.0",
      });
    };
    nativeUpdater.checkForUpdate = checkForUpdate;
    const dependencies = createDependencies({
      getUpdateMode: () => Promise.resolve("off"),
      updater: {
        ...nativeUpdater,
        checkForUpdate,
      },
    });
    const service = createService(dependencies);

    await service.checkForUpdates(false);
    await service.checkForUpdates(true);

    expect(checks).toBe(0);
  });

  test("records initialization failures instead of rejecting start", async () => {
    const errorLog = spyOn(console, "error").mockImplementation(
      () => undefined
    );
    const service = createService(
      createDependencies({
        updater: {
          ...nativeUpdater,
          getLocalInfo: () => Promise.reject(new Error("local info failed")),
        },
      })
    );

    try {
      await service.start();
      expect(errorLog).toHaveBeenCalledWith(
        "Failed to start updater:",
        expect.any(Error)
      );
    } finally {
      errorLog.mockRestore();
    }
  });

  test("reuses one in-flight apply promise", async () => {
    let applyCalls = 0;
    let finishApply: (() => void) | undefined;
    const applyGate = new Promise<void>((resolve) => {
      finishApply = resolve;
    });
    const service = createService(
      createDependencies({
        updater: {
          ...nativeUpdater,
          applyUpdate: () => {
            applyCalls += 1;
            return applyGate;
          },
        },
      })
    );

    const first = service.applyUpdateAndRestart();
    const second = service.applyUpdateAndRestart();

    expect(second).toBe(first);
    expect(applyCalls).toBe(1);
    finishApply?.();
    await first;
  });

  test("clears the apply grace timer when stopped", async () => {
    const graceTimer = { kind: "apply-grace" };
    const cleared: unknown[] = [];
    const service = createService(
      createDependencies({
        setTimeout: () => graceTimer,
        clearTimeout: (timer) => cleared.push(timer),
      })
    );

    await service.applyUpdateAndRestart();
    service.stop();

    expect(cleared).toContain(graceTimer);
  });

  test("keeps apply locked after native apply resolves until grace completes", async () => {
    let applyCalls = 0;
    const service = createService(
      createDependencies({
        updater: {
          ...nativeUpdater,
          applyUpdate: () => {
            applyCalls += 1;
            return Promise.resolve();
          },
        },
      })
    );

    const first = service.applyUpdateAndRestart();
    await first;
    const repeated = service.applyUpdateAndRestart();

    expect(repeated).toBe(first);
    expect(applyCalls).toBe(1);
  });

  test("propagates update-mode persistence failures", async () => {
    const service = createService(
      createDependencies({
        persistUpdateMode: () => Promise.reject(new Error("disk full")),
      })
    );

    let caught: unknown;
    try {
      await service.setUpdateModeSetting("manual");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe("disk full");
  });

  test("synchronizes the native menu after persisting update mode", async () => {
    const menuModes: UpdateMode[] = [];
    const service = createService(
      createDependencies({
        setUpdateModeInMenu: (mode) => menuModes.push(mode),
      })
    );

    await service.setUpdateModeSetting("off");

    expect(menuModes).toEqual(["off"]);
  });
});
