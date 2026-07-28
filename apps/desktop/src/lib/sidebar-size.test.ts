import { afterEach, describe, expect, test } from "bun:test";

import { LOCAL_STORAGE_KEYS } from "@shallinta/ui/lib/local-storage";

import {
  DEFAULT_SIDEBAR_SIZE,
  persistSidebarSize,
  readSidebarSize,
} from "./sidebar-size";

const ORIGINAL_WINDOW_DESCRIPTOR = Object.getOwnPropertyDescriptor(
  globalThis,
  "window"
);

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();

  get length(): number {
    return this.#values.size;
  }

  clear(): void {
    this.#values.clear();
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.#values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}

function setWindowLocalStorage(storage: Storage): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  });
}

afterEach(() => {
  if (ORIGINAL_WINDOW_DESCRIPTOR) {
    Object.defineProperty(globalThis, "window", ORIGINAL_WINDOW_DESCRIPTOR);
    return;
  }

  Reflect.deleteProperty(globalThis, "window");
});

describe("readSidebarSize", () => {
  test("uses the default size when no persisted size exists", () => {
    setWindowLocalStorage(new MemoryStorage());

    expect(readSidebarSize()).toBe(DEFAULT_SIDEBAR_SIZE);
    expect(DEFAULT_SIDEBAR_SIZE).toBe("20%");
  });

  test.each(["not-a-number", "-1", "0", "Infinity"])(
    "uses the default size for invalid persisted value %s",
    (value) => {
      const storage = new MemoryStorage();
      storage.setItem(LOCAL_STORAGE_KEYS.sidebarSize, value);
      setWindowLocalStorage(storage);

      expect(readSidebarSize()).toBe(DEFAULT_SIDEBAR_SIZE);
    }
  );

  test("restores a positive persisted pixel size", () => {
    const storage = new MemoryStorage();
    storage.setItem(LOCAL_STORAGE_KEYS.sidebarSize, "384");
    setWindowLocalStorage(storage);

    expect(readSidebarSize()).toBe(384);
  });
});

describe("persistSidebarSize", () => {
  test("rounds and persists a positive pixel size", () => {
    const storage = new MemoryStorage();
    setWindowLocalStorage(storage);

    persistSidebarSize(384.6);

    expect(storage.getItem(LOCAL_STORAGE_KEYS.sidebarSize)).toBe("385");
  });

  test.each([0, -1, Number.POSITIVE_INFINITY, Number.NaN])(
    "does not persist invalid pixel size %s",
    (value) => {
      const storage = new MemoryStorage();
      setWindowLocalStorage(storage);

      persistSidebarSize(value);

      expect(storage.getItem(LOCAL_STORAGE_KEYS.sidebarSize)).toBeNull();
    }
  );
});
