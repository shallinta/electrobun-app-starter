import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createLocaleStateStore, type LocaleStateStore } from "./state";

let settingsDir: string;
let statePath: string;
let store: LocaleStateStore;

beforeEach(async () => {
  settingsDir = await mkdtemp(join(tmpdir(), "electrobun-locale-state-"));
  statePath = join(settingsDir, "locale.json");
  store = createLocaleStateStore(settingsDir, () => "zh-Hant-TW");
});

afterEach(async () => {
  await rm(settingsDir, { recursive: true, force: true });
});

describe("locale state persistence", () => {
  test("uses the mapped system locale on first launch", async () => {
    expect(await store.getLocale()).toBe("zh-CN");
    expect(JSON.parse(await readFile(statePath, "utf8"))).toEqual({
      locale: "zh-CN",
    });
  });

  test("uses the mapped system locale when persisted JSON is malformed", async () => {
    await mkdir(settingsDir, { recursive: true });
    await Bun.write(statePath, "{not-json");

    expect(await store.getLocale()).toBe("zh-CN");
    expect(JSON.parse(await readFile(statePath, "utf8"))).toEqual({
      locale: "zh-CN",
    });
  });

  test("ignores persisted locales outside the supported set", async () => {
    await Bun.write(statePath, JSON.stringify({ locale: "fr-FR" }));

    expect(await store.getLocale()).toBe("zh-CN");
    expect(JSON.parse(await readFile(statePath, "utf8"))).toEqual({
      locale: "zh-CN",
    });
  });

  test.each([null, "zh-CN", 42, ["zh-CN"]])(
    "safely ignores non-object persisted JSON: %p",
    async (persisted) => {
      await Bun.write(statePath, JSON.stringify(persisted));

      expect(await store.getLocale()).toBe("zh-CN");
      expect(JSON.parse(await readFile(statePath, "utf8"))).toEqual({
        locale: "zh-CN",
      });
    }
  );

  test("persists an explicit supported locale atomically", async () => {
    await store.setLocale("en-US");

    expect(await store.getLocale()).toBe("en-US");
    expect(JSON.parse(await readFile(statePath, "utf8"))).toEqual({
      locale: "en-US",
    });
  });
});
