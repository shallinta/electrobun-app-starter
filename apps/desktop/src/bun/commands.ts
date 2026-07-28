import type { BrowserWindow } from "electrobun/bun";

import { COMMAND_META, type Command } from "../shared/commands";

import { parseExternalUrl } from "./parse-external-url";
import type { UpdaterService } from "./updates";

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3;
const clampZoom = (zoom: number) =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));

export interface BunCommandDependencies {
  openExternal: (url: string) => void;
  saveZoom: (zoom: number) => void;
  sendToWebview: (command: Command) => void;
  updater: Pick<UpdaterService, "applyUpdateAndRestart" | "checkForUpdates">;
}

export function executeCommandInBun(
  command: Command,
  window: BrowserWindow,
  dependencies: BunCommandDependencies
) {
  if (COMMAND_META[command.type].target === "webview") {
    dependencies.sendToWebview(command);
    return;
  }

  switch (command.type) {
    case "zoomIn": {
      const zoom = clampZoom(window.getPageZoom() + ZOOM_STEP);
      window.setPageZoom(zoom);
      dependencies.saveZoom(zoom);
      return;
    }
    case "zoomOut": {
      const zoom = clampZoom(window.getPageZoom() - ZOOM_STEP);
      window.setPageZoom(zoom);
      dependencies.saveZoom(zoom);
      return;
    }
    case "resetZoom":
      window.setPageZoom(1);
      dependencies.saveZoom(1);
      return;
    case "reload":
      window.webview?.executeJavascript("location.reload()");
      return;
    case "toggleMaximized":
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
      return;
    case "openLink": {
      let url: URL;
      try {
        url = parseExternalUrl(command.args.url);
      } catch {
        console.error("Blocked unsafe external URL.");
        return;
      }
      dependencies.openExternal(url.href);
      return;
    }
    case "checkForUpdates":
      void dependencies.updater.checkForUpdates(true);
      return;
    case "applyUpdateAndRestart":
      void dependencies.updater.applyUpdateAndRestart();
      return;
    default:
      return;
  }
}
