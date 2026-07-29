import {
  ApplicationMenu,
  type ApplicationMenuItemConfig,
  type BrowserWindow,
} from "electrobun/bun";

import type { Command } from "../../shared/commands";
import type { SupportedLocale } from "../../shared/i18n";
import type { UpdateMode } from "../../shared/updates";
import { activateBunLocale, translate as t } from "../i18n";

const DOCS_URL = "https://github.com/shallinta/electrobun-app-starter#readme";
const HOMEPAGE_URL = "https://github.com/shallinta/electrobun-app-starter";
const REPOSITORY_URL = "https://github.com/shallinta/electrobun-app-starter";

let currentUpdateMode: UpdateMode = "automatic";
let currentUpdateReady = false;

function appSubmenu(
  updateReady: boolean,
  updateMode: UpdateMode
): ApplicationMenuItemConfig {
  const updateItem = updateReady
    ? {
        label: t("menu:app.restartToUpdate"),
        action: "restartToUpdate",
      }
    : {
        label: t("menu:app.checkForUpdates"),
        action: "checkForUpdates",
        enabled: updateMode !== "off",
      };
  return {
    submenu: [
      { label: t("menu:app.about"), role: "about" },
      updateItem,
      { type: "divider" },
      {
        label: t("menu:app.settings"),
        action: "settings",
        accelerator: "CommandOrControl+,",
      },
      { type: "divider" },
      {
        label: t("menu:app.hide"),
        role: "hide",
        accelerator: "CommandOrControl+H",
      },
      {
        label: t("menu:app.hideOthers"),
        role: "hideOthers",
        accelerator: "CommandOrControl+Shift+H",
      },
      { label: t("menu:app.showAll"), role: "showAll" },
      { type: "divider" },
      {
        label: t("menu:app.quit"),
        role: "quit",
        accelerator: "CommandOrControl+Q",
      },
    ],
  };
}

function buildMenu(
  updateReady: boolean,
  updateMode: UpdateMode
): ApplicationMenuItemConfig[] {
  return [
    appSubmenu(updateReady, updateMode),
    {
      label: t("menu:file.title"),
      submenu: [
        { label: t("menu:file.new"), enabled: false },
        { label: t("menu:file.open"), enabled: false },
      ],
    },
    {
      label: t("menu:edit.title"),
      submenu: [
        { label: t("menu:edit.undo"), role: "undo" },
        { label: t("menu:edit.redo"), role: "redo" },
        { type: "divider" },
        { label: t("menu:edit.cut"), role: "cut" },
        { label: t("menu:edit.copy"), role: "copy" },
        { label: t("menu:edit.paste"), role: "paste" },
        {
          label: t("menu:edit.pasteAndMatchStyle"),
          role: "pasteAndMatchStyle",
        },
        { label: t("menu:edit.delete"), role: "delete" },
        { label: t("menu:edit.selectAll"), role: "selectAll" },
      ],
    },
    {
      label: t("menu:view.title"),
      submenu: [
        {
          label: t("menu:view.toggleSidebar"),
          action: "toggleSidebar",
          accelerator: "CommandOrControl+B",
        },
        { type: "divider" },
        {
          label: t("menu:view.commandPalette"),
          action: "commandPalette",
          accelerator: "CommandOrControl+Shift+P",
        },
        { type: "divider" },
        {
          label: t("menu:view.reload"),
          action: "reload",
          accelerator: "CommandOrControl+Shift+R",
        },
        { type: "divider" },
        {
          label: t("menu:view.zoomIn"),
          action: "zoomIn",
          accelerator: "CommandOrControl+Plus",
        },
        {
          label: t("menu:view.zoomOut"),
          action: "zoomOut",
          accelerator: "CommandOrControl+-",
        },
        {
          label: t("menu:view.resetZoom"),
          action: "resetZoom",
          accelerator: "CommandOrControl+0",
        },
      ],
    },
    {
      label: t("menu:window.title"),
      role: "window",
      submenu: [
        { label: t("menu:window.minimize"), role: "minimize" },
        {
          label: t("menu:window.bringAllToFront"),
          role: "bringAllToFront",
        },
        { type: "divider" },
        {
          label: t("menu:window.toggleFullScreen"),
          role: "toggleFullScreen",
          accelerator: "CommandOrControl+Shift+F",
        },
      ],
    },
    {
      label: t("menu:help.title"),
      submenu: [
        {
          label: t("menu:help.documentation"),
          action: "openDocumentation",
        },
        { label: t("menu:help.homepage"), action: "openHomepage" },
        { label: t("menu:help.repository"), action: "openRepository" },
      ],
    },
  ];
}

export async function setLocaleInMenu(locale: SupportedLocale): Promise<void> {
  await activateBunLocale(locale);
  ApplicationMenu.setApplicationMenu(
    buildMenu(currentUpdateReady, currentUpdateMode)
  );
}

export function setUpdateReadyInMenu(version: string | null) {
  currentUpdateReady = version !== null;
  ApplicationMenu.setApplicationMenu(
    buildMenu(currentUpdateReady, currentUpdateMode)
  );
}

export function setUpdateModeInMenu(mode: UpdateMode) {
  currentUpdateMode = mode;
  ApplicationMenu.setApplicationMenu(
    buildMenu(currentUpdateReady, currentUpdateMode)
  );
}

const MENU_ACTION_COMMANDS: Record<string, Command> = {
  settings: { type: "openSettings", args: {} },
  commandPalette: { type: "openCommandPalette", args: {} },
  toggleSidebar: { type: "toggleSidebar", args: {} },
  reload: { type: "reload", args: {} },
  zoomIn: { type: "zoomIn", args: {} },
  zoomOut: { type: "zoomOut", args: {} },
  resetZoom: { type: "resetZoom", args: {} },
  checkForUpdates: { type: "checkForUpdates", args: {} },
  restartToUpdate: { type: "applyUpdateAndRestart", args: {} },
  openDocumentation: { type: "openLink", args: { url: DOCS_URL } },
  openHomepage: { type: "openLink", args: { url: HOMEPAGE_URL } },
  openRepository: { type: "openLink", args: { url: REPOSITORY_URL } },
};

export function registerMenuActions(
  window: BrowserWindow,
  executeCommand: (command: Command, window: BrowserWindow) => void
) {
  currentUpdateReady = false;
  ApplicationMenu.setApplicationMenu(
    buildMenu(currentUpdateReady, currentUpdateMode)
  );
  ApplicationMenu.on("application-menu-clicked", (event) => {
    const { action } = (event as { data: { action: string } }).data;
    const command = MENU_ACTION_COMMANDS[action];
    if (command) executeCommand(command, window);
  });
}
