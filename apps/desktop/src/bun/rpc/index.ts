import { BrowserView, type BrowserWindow } from "electrobun/bun";

import type { Command } from "../../shared/commands";
import type { DesktopRPCType } from "../../shared/rpc";
import type { UpdaterService } from "../updates";

export type MainWindowRPC = ReturnType<
  typeof BrowserView.defineRPC<DesktopRPCType>
>;

export interface MainWindowRPCDependencies {
  executeCommand: (command: Command) => void;
  getMainWindow: () => BrowserWindow;
  updater: UpdaterService;
}

const MAX_REQUEST_TIME_MS = 5 * 60_000 + 10_000;

export function createMainWindowRPC({
  executeCommand,
  getMainWindow,
  updater,
}: MainWindowRPCDependencies): MainWindowRPC {
  return BrowserView.defineRPC<DesktopRPCType>({
    maxRequestTime: MAX_REQUEST_TIME_MS,
    handlers: {
      requests: {
        updateMode: () => updater.getUpdateModeSetting(),
        setUpdateMode: async ({ mode }) => {
          await updater.setUpdateModeSetting(mode);
          return null;
        },
        pendingInstalledVersion: () => updater.getInstalledVersion(),
        isFullScreen: () => ({
          fullScreen: getMainWindow().isFullScreen(),
        }),
      },
      messages: {
        executeCommand,
      },
    },
  });
}
