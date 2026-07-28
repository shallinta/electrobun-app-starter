import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";


import { createUpdatesStateStore, type UpdatesStateStore } from "./state";

let settingsDir: string;
let statePath: string;
let store: UpdatesStateStore;

beforeEach(async () => {
  settingsDir = await mkdtemp(join(tmpdir(), "electrobun-update-state-"));
  statePath = join(settingsDir, "updates.json");
  store = createUpdatesStateStore(settingsDir);
});

afterEach(async () => {
  await rm(settingsDir, { recursive: true, force: true });
});

describe("update state persistence", () => {
  test("uses defaults when persisted JSON is malformed", async () => {
    await mkdir(settingsDir, { recursive: true });
    await Bun.write(statePath, "{not-json");

    expect(await store.getUpdateMode()).toBe("automatic");
    expect(await store.getLastSeenHash("app.test")).toBeUndefined();
  });

  test("serializes concurrent patches without losing either field", async () => {
    await Promise.all([
      store.setUpdateMode("manual"),
      store.setLastSeenHash("app.test", "hash-1"),
    ]);

    expect(await store.getUpdateMode()).toBe("manual");
    expect(await store.getLastSeenHash("app.test")).toBe("hash-1");
    expect(JSON.parse(await readFile(statePath, "utf8"))).toEqual({
      mode: "manual",
      lastSeenHashes: { "app.test": "hash-1" },
    });
  });
});
