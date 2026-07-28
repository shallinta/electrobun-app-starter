import {
  saveWindowFrame,
  saveWindowFullScreen,
  saveWindowMaximized,
  saveWindowZoom,
  type WindowFrame,
} from "@shallinta/shared/server";
import { app, type BrowserWindow } from "electrobun/bun";

const SAVE_DEBOUNCE_MS = 300;

interface WindowStatePersistenceDependencies {
  saveFrame(frame: WindowFrame): Promise<void>;
  saveFullScreen(isFullScreen: boolean): Promise<void>;
  saveMaximized(isMaximized: boolean): Promise<void>;
  saveZoom(zoom: number): Promise<void>;
}

const DEFAULT_DEPENDENCIES: WindowStatePersistenceDependencies = {
  saveFrame: saveWindowFrame,
  saveFullScreen: saveWindowFullScreen,
  saveMaximized: saveWindowMaximized,
  saveZoom: saveWindowZoom,
};

export interface WindowStatePersistence {
  saveZoom(zoom: number): void;
  flush(): Promise<void>;
}

interface WindowStateOptions {
  isMaximized?: boolean;
  isFullScreen?: boolean;
  zoom?: number;
  onFullScreenChange?: (isFullScreen: boolean) => void;
}

export function createWindowStatePersistence(
  win: BrowserWindow,
  options: WindowStateOptions,
  dependencies: WindowStatePersistenceDependencies = DEFAULT_DEPENDENCIES
): WindowStatePersistence {
  let desiredZoom = options.zoom ?? 1;
  let frameTimer: ReturnType<typeof setTimeout> | undefined;
  let zoomTimer: ReturnType<typeof setTimeout> | undefined;
  let frameWritePending = false;
  let zoomWritePending = false;
  let writeError: unknown;
  let writeQueue: Promise<void> = Promise.resolve();

  const enqueue = (write: () => Promise<void>): void => {
    writeQueue = writeQueue.then(write).catch((error) => {
      writeError ??= error;
    });
  };

  const persistFrame = (): void => {
    frameWritePending = false;
    if (win.isFullScreen()) {
      enqueue(() => dependencies.saveFullScreen(true));
    } else if (win.isMaximized()) {
      enqueue(() => dependencies.saveMaximized(true));
    } else {
      const frame = win.getFrame();
      enqueue(() => dependencies.saveFrame(frame));
    }
  };

  const persistZoom = (): void => {
    zoomWritePending = false;
    const zoom = desiredZoom;
    enqueue(() => dependencies.saveZoom(zoom));
  };

  const scheduleFrameSave = (): void => {
    frameWritePending = true;
    clearTimeout(frameTimer);
    frameTimer = setTimeout(persistFrame, SAVE_DEBOUNCE_MS);
  };

  if (options.isFullScreen) {
    win.setFullScreen(true);
  } else if (options.isMaximized) {
    win.maximize();
  }
  if (desiredZoom !== 1) win.setPageZoom(desiredZoom);

  let lastFullScreen = win.isFullScreen();
  options.onFullScreenChange?.(lastFullScreen);
  const handleResize = (): void => {
    const isFullScreen = win.isFullScreen();
    if (isFullScreen !== lastFullScreen) {
      lastFullScreen = isFullScreen;
      options.onFullScreenChange?.(isFullScreen);
    }
    scheduleFrameSave();
  };

  win.on("close", persistFrame);
  app.on("before-quit", persistFrame);
  win.on("move", scheduleFrameSave);
  win.on("resize", handleResize);
  win.webview?.on("dom-ready", () => {
    if (win.getPageZoom() !== desiredZoom) win.setPageZoom(desiredZoom);
  });

  return {
    saveZoom(zoom) {
      desiredZoom = zoom;
      zoomWritePending = true;
      clearTimeout(zoomTimer);
      zoomTimer = setTimeout(persistZoom, SAVE_DEBOUNCE_MS);
    },
    async flush() {
      clearTimeout(frameTimer);
      clearTimeout(zoomTimer);
      if (frameWritePending) persistFrame();
      if (zoomWritePending) persistZoom();
      await writeQueue;
      if (writeError) {
        const error = writeError;
        writeError = undefined;
        throw error instanceof Error
          ? error
          : new Error("Window state persistence failed.", { cause: error });
      }
    },
  };
}

let activePersistence: WindowStatePersistence | undefined;

export function attachWindowStates(
  win: BrowserWindow,
  options: WindowStateOptions
): WindowStatePersistence {
  activePersistence = createWindowStatePersistence(win, options);
  return activePersistence;
}

export function saveZoom(zoom: number): void {
  activePersistence?.saveZoom(zoom);
}
