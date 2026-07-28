import { afterEach, describe, expect, test } from "bun:test";

import {
  LOCAL_STORAGE_KEYS,
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "./local-storage";

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

describe("local storage registry", () => {
  test("contains only the shared preference keys", () => {
    expect(LOCAL_STORAGE_KEYS).toEqual({
      theme: "electrobun-app-starter-theme",
      primaryColor: "electrobun-app-starter-primary",
      sidebarSize: "electrobun-app-starter:sidebar-size",
    });
  });
});

describe("safe local storage operations", () => {
  test("reads, writes, and removes values", () => {
    const storage = new MemoryStorage();
    setWindowLocalStorage(storage);

    expect(writeLocalStorage(LOCAL_STORAGE_KEYS.theme, "dark")).toBe(true);
    expect(readLocalStorage(LOCAL_STORAGE_KEYS.theme)).toBe("dark");
    expect(removeLocalStorage(LOCAL_STORAGE_KEYS.theme)).toBe(true);
    expect(readLocalStorage(LOCAL_STORAGE_KEYS.theme)).toBeNull();
  });

  test("returns safe fallbacks when window is unavailable", () => {
    Reflect.deleteProperty(globalThis, "window");

    expect(readLocalStorage(LOCAL_STORAGE_KEYS.theme)).toBeNull();
    expect(writeLocalStorage(LOCAL_STORAGE_KEYS.theme, "dark")).toBe(false);
    expect(removeLocalStorage(LOCAL_STORAGE_KEYS.theme)).toBe(false);
  });

  test("returns safe fallbacks when the localStorage getter throws", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: Object.defineProperty({}, "localStorage", {
        get() {
          throw new Error("localStorage unavailable");
        },
      }),
    });

    expect(readLocalStorage(LOCAL_STORAGE_KEYS.theme)).toBeNull();
    expect(writeLocalStorage(LOCAL_STORAGE_KEYS.theme, "dark")).toBe(false);
    expect(removeLocalStorage(LOCAL_STORAGE_KEYS.theme)).toBe(false);
  });

  test("returns null when getItem throws", () => {
    const storage = new MemoryStorage();
    storage.getItem = () => {
      throw new Error("read failed");
    };
    setWindowLocalStorage(storage);

    expect(readLocalStorage(LOCAL_STORAGE_KEYS.theme)).toBeNull();
  });

  test("returns false when setItem throws", () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error("write failed");
    };
    setWindowLocalStorage(storage);

    expect(writeLocalStorage(LOCAL_STORAGE_KEYS.theme, "dark")).toBe(false);
  });

  test("returns false when removeItem throws", () => {
    const storage = new MemoryStorage();
    storage.removeItem = () => {
      throw new Error("remove failed");
    };
    setWindowLocalStorage(storage);

    expect(removeLocalStorage(LOCAL_STORAGE_KEYS.theme)).toBe(false);
  });
});
