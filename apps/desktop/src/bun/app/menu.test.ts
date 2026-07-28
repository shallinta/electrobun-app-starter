import { expect, mock, test } from "bun:test";

import {
  applicationMenus as menus,
  electrobunBunMock,
} from "../test-electrobun-mock";

await mock.module("electrobun/bun", () => electrobunBunMock);

const menuModule = await import("./menu");

test("provides an update-mode menu synchronizer", () => {
  expect(
    (
      menuModule as typeof menuModule & {
        setUpdateModeInMenu?: unknown;
      }
    ).setUpdateModeInMenu
  ).toBeFunction();
});

test("disables the native check-for-updates item in off mode", () => {
  menuModule.registerMenuActions({} as never, () => undefined);
  menuModule.setUpdateModeInMenu("off");

  const latestMenu = menus[menus.length - 1] as {
    submenu: { action?: string; enabled?: boolean }[];
  }[];
  const checkItem = latestMenu[0]?.submenu.find(
    (item) => item.action === "checkForUpdates"
  );
  expect(checkItem?.enabled).toBe(false);
});

test("adds disabled File menu placeholders before Edit", () => {
  menuModule.registerMenuActions({} as never, () => undefined);

  const latestMenu = menus[menus.length - 1] as {
    label?: string;
    submenu?: {
      label?: string;
      enabled?: boolean;
      action?: string;
    }[];
  }[];

  expect(latestMenu.slice(1, 3).map(({ label }) => label)).toEqual([
    "File",
    "Edit",
  ]);
  expect(latestMenu[1]?.submenu).toEqual([
    { label: "New...", enabled: false },
    { label: "Open...", enabled: false },
  ]);
});
