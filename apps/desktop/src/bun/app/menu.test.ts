import { expect, mock, test } from "bun:test";

import {
  applicationMenus as menus,
  electrobunBunMock,
} from "../test-electrobun-mock";

let applicationMenuListener:
  | ((event: { data: { action: string } }) => void)
  | undefined;

await mock.module("electrobun/bun", () => ({
  ...electrobunBunMock,
  ApplicationMenu: {
    ...electrobunBunMock.ApplicationMenu,
    on: (
      _event: string,
      listener: (event: { data: { action: string } }) => void
    ) => {
      applicationMenuListener = listener;
    },
  },
}));

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

test("adds Toggle Sidebar first in the View menu", () => {
  menuModule.registerMenuActions({} as never, () => undefined);

  const latestMenu = menus[menus.length - 1] as {
    label?: string;
    submenu?: {
      label?: string;
      action?: string;
      accelerator?: string;
      type?: string;
    }[];
  }[];
  const viewMenu = latestMenu.find(({ label }) => label === "View");

  expect(viewMenu?.submenu?.slice(0, 2)).toEqual([
    {
      label: "Toggle Sidebar",
      action: "toggleSidebar",
      accelerator: "CommandOrControl+B",
    },
    { type: "divider" },
  ]);
});

test("dispatches the Toggle Sidebar menu action", () => {
  const fakeWindow = {} as never;
  const executeCommand = mock(() => undefined);
  menuModule.registerMenuActions(fakeWindow, executeCommand);

  expect(applicationMenuListener).toBeFunction();
  applicationMenuListener?.({ data: { action: "toggleSidebar" } });

  expect(executeCommand).toHaveBeenCalledWith(
    { type: "toggleSidebar", args: {} },
    fakeWindow
  );
});
