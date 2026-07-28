import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";


import { getWindowStatePath } from "./paths";
import {
  loadWindowState,
  saveWindowFrame,
  saveWindowZoom,
} from "./window-state";

const ORIGINAL_APP_HOME = process.env.ELECTROBUN_APP_STARTER_HOME;
let testHome: string | undefined;

afterEach(async () => {
  if (testHome) await rm(testHome, { recursive: true, force: true });
  testHome = undefined;
  if (ORIGINAL_APP_HOME === undefined) {
    delete process.env.ELECTROBUN_APP_STARTER_HOME;
  } else {
    process.env.ELECTROBUN_APP_STARTER_HOME = ORIGINAL_APP_HOME;
  }
});

async function useTemporaryAppHome(): Promise<void> {
  testHome = await mkdtemp(join(tmpdir(), "electrobun-window-state-"));
  process.env.ELECTROBUN_APP_STARTER_HOME = testHome;
}

describe("window state persistence", () => {
  test("treats malformed persisted JSON as empty state", async () => {
    await useTemporaryAppHome();
    await Bun.write(getWindowStatePath(), "{not-json");

    expect(await loadWindowState()).toEqual({});
  });

  test("serializes concurrent field updates without losing either field", async () => {
    await useTemporaryAppHome();
    const frame = { x: 10, y: 20, width: 900, height: 700 };

    await Promise.all([saveWindowFrame(frame), saveWindowZoom(1.25)]);

    expect(await loadWindowState()).toEqual({
      frame,
      isMaximized: false,
      isFullScreen: false,
      zoom: 1.25,
    });
    expect(JSON.parse(await readFile(getWindowStatePath(), "utf8"))).toEqual(
      await loadWindowState()
    );
  });
});
