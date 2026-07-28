import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";

import { getSettingsDir, getWindowStatePath } from "./paths";

export interface WindowFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowState {
  frame?: WindowFrame;
  isMaximized?: boolean;
  isFullScreen?: boolean;
  zoom?: number;
}

export const DEFAULT_WINDOW_FRAME: WindowFrame = {
  x: 80,
  y: 80,
  width: 1280,
  height: 800,
};

let mutationQueue: Promise<void> = Promise.resolve();

function isWindowFrame(value: unknown): value is WindowFrame {
  if (typeof value !== "object" || value === null) return false;
  const frame = value as WindowFrame;
  return (
    typeof frame.x === "number" &&
    typeof frame.y === "number" &&
    typeof frame.width === "number" &&
    typeof frame.height === "number" &&
    Number.isFinite(frame.x) &&
    Number.isFinite(frame.y) &&
    frame.width > 0 &&
    frame.height > 0
  );
}

export function getWindowFrame(state: WindowState): WindowFrame | undefined {
  return isWindowFrame(state.frame) ? state.frame : undefined;
}

export function getWindowMaximized(state: WindowState): boolean {
  return state.isMaximized === true;
}

export function getWindowFullScreen(state: WindowState): boolean {
  return state.isFullScreen === true;
}

export function getWindowZoom(state: WindowState): number | undefined {
  const zoom = state.zoom;
  return typeof zoom === "number" && Number.isFinite(zoom) && zoom > 0
    ? zoom
    : undefined;
}

export async function loadWindowState(): Promise<WindowState> {
  try {
    const text = await fs.readFile(getWindowStatePath(), "utf8");
    return JSON.parse(text) as WindowState;
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return {};
    }
    throw error;
  }
}

async function writeWindowState(next: WindowState): Promise<void> {
  const statePath = getWindowStatePath();
  const temporaryPath = `${statePath}.${process.pid}.${randomUUID()}.tmp`;
  await fs.mkdir(getSettingsDir(), { recursive: true });
  try {
    await fs.writeFile(
      temporaryPath,
      `${JSON.stringify(next, null, 2)}\n`,
      "utf8"
    );
    await fs.rename(temporaryPath, statePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

function updateWindowState(
  update: (state: WindowState) => WindowState
): Promise<void> {
  const operation = mutationQueue.then(async () => {
    await writeWindowState(update(await loadWindowState()));
  });
  mutationQueue = operation.catch(() => undefined);
  return operation;
}

export async function saveWindowFrame(frame: WindowFrame): Promise<void> {
  await updateWindowState((state) => ({
    ...state,
    frame,
    isMaximized: false,
    isFullScreen: false,
  }));
}

export async function saveWindowMaximized(isMaximized: boolean): Promise<void> {
  await updateWindowState((state) => ({
    ...state,
    isMaximized,
    isFullScreen: false,
  }));
}

export async function saveWindowFullScreen(
  isFullScreen: boolean
): Promise<void> {
  await updateWindowState((state) => ({ ...state, isFullScreen }));
}

export async function saveWindowZoom(zoom: number): Promise<void> {
  await updateWindowState((state) => ({ ...state, zoom }));
}
