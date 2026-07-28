import Electrobun, {
  app,
  type BrowserWindow,
  type ElectrobunEvent,
  Utils,
} from "electrobun/bun";

import type { Command } from "../../shared/commands";
import { executeCommandInBun } from "../commands";
import { createMainWindowRPC, type MainWindowRPC } from "../rpc";
import { UpdaterService } from "../updates";

import { createShutdownCoordinator } from "./shutdown-coordinator";
import { createMainWindow, type ManagedMainWindow } from "./window";

export interface DesktopAppRuntime {
  stop(): Promise<void>;
}

export async function startDesktopApp(): Promise<DesktopAppRuntime> {
  let mainWindow: ManagedMainWindow | null = null;
  let rpc: MainWindowRPC | null = null;

  const getRpc = (): MainWindowRPC => {
    if (!rpc) throw new Error("Main window RPC is not ready.");
    return rpc;
  };
  const getMainWindow = (): BrowserWindow => {
    if (!mainWindow) throw new Error("Main window is not ready.");
    return mainWindow.window;
  };

  const updater = new UpdaterService((message) =>
    getRpc().send.updateStatusChanged(message)
  );
  const commandDependencies = {
    openExternal: Utils.openExternal,
    sendToWebview: (command: Command) => getRpc().send.executeCommand(command),
    saveZoom: (zoom: number) => mainWindow?.saveZoom(zoom),
    updater,
  };
  const executeCommand = (command: Command, window: BrowserWindow): void =>
    executeCommandInBun(command, window, commandDependencies);

  let stopPromise: Promise<void> | null = null;
  const runtime: DesktopAppRuntime = {
    stop() {
      stopPromise ??= stopDesktopApp([
        ["window state", () => mainWindow?.flushState()],
        ["updater", () => updater.stop()],
      ]);
      return stopPromise;
    },
  };

  try {
    rpc = createMainWindowRPC({
      executeCommand: (command) => executeCommand(command, getMainWindow()),
      updater,
    });
    mainWindow = await createMainWindow({ rpc, executeCommand });
    void updater.start();

    const handleBeforeQuit = createShutdownCoordinator({
      quit: () => app.quit(),
      stop: () => runtime.stop(),
    });
    Electrobun.events.on(
      "before-quit",
      (event: ElectrobunEvent<{}, { allow: boolean }>) =>
        handleBeforeQuit(event)
    );

    return runtime;
  } catch (error) {
    await runtime.stop();
    throw error;
  }
}

async function stopDesktopApp(
  cleanups: readonly [name: string, cleanup: () => Promise<void> | void][]
): Promise<void> {
  for (const [name, cleanup] of cleanups) {
    try {
      await cleanup();
    } catch (error) {
      console.error(`Failed to stop ${name}:`, error);
    }
  }
}
