import {
  ApplicationMenu,
  type ApplicationMenuItemConfig,
  type BrowserWindow,
} from "electrobun/bun";

import type { Command } from "../../shared/commands";
import type { UpdateMode } from "../../shared/updates";

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
    ? { label: "Restart to Update", action: "restartToUpdate" }
    : {
        label: "Check for Updates...",
        action: "checkForUpdates",
        enabled: updateMode !== "off",
      };
  return {
    submenu: [
      { label: "About Electrobun App Starter", role: "about" },
      updateItem,
      { type: "divider" },
      {
        label: "Settings...",
        action: "settings",
        accelerator: "CommandOrControl+,",
      },
      { type: "divider" },
      { role: "hide", accelerator: "CommandOrControl+H" },
      { role: "hideOthers", accelerator: "CommandOrControl+Shift+H" },
      { role: "showAll" },
      { type: "divider" },
      {
        label: "Quit Electrobun App Starter",
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
      label: "File",
      submenu: [
        { label: "New...", enabled: false },
        { label: "Open...", enabled: false },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "divider" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "delete" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Command Palette...",
          action: "commandPalette",
          accelerator: "CommandOrControl+Shift+P",
        },
        { type: "divider" },
        {
          label: "Reload",
          action: "reload",
          accelerator: "CommandOrControl+Shift+R",
        },
        { type: "divider" },
        {
          label: "Zoom In",
          action: "zoomIn",
          accelerator: "CommandOrControl+Plus",
        },
        {
          label: "Zoom Out",
          action: "zoomOut",
          accelerator: "CommandOrControl+-",
        },
        {
          label: "Reset Zoom",
          action: "resetZoom",
          accelerator: "CommandOrControl+0",
        },
      ],
    },
    {
      label: "Window",
      role: "window",
      submenu: [
        { role: "minimize" },
        { role: "bringAllToFront" },
        { type: "divider" },
        { role: "toggleFullScreen", accelerator: "CommandOrControl+Shift+F" },
      ],
    },
    {
      label: "Help",
      submenu: [
        { label: "View Documentation", action: "openDocumentation" },
        { label: "Visit Official Website", action: "openHomepage" },
        { label: "Visit GitHub Project", action: "openRepository" },
      ],
    },
  ];
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
