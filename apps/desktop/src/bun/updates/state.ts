import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { getSettingsDir } from "@shallinta/shared/server";

import { DEFAULT_UPDATE_MODE, type UpdateMode } from "../../shared/updates";

interface UpdatesState {
  mode?: UpdateMode;
  lastSeenHashes?: Record<string, string>;
}

const VALID_MODES: readonly UpdateMode[] = ["automatic", "manual", "off"];

export interface UpdatesStateStore {
  getUpdateMode(): Promise<UpdateMode>;
  setUpdateMode(mode: UpdateMode): Promise<void>;
  getLastSeenHash(identifier: string): Promise<string | undefined>;
  setLastSeenHash(identifier: string, hash: string): Promise<void>;
}

/** Persist updater state under an explicit settings directory. */
export function createUpdatesStateStore(
  settingsDir: string
): UpdatesStateStore {
  const statePath = join(settingsDir, "updates.json");
  let mutationQueue: Promise<void> = Promise.resolve();

  const load = async (): Promise<UpdatesState> => {
    try {
      return JSON.parse(await readFile(statePath, "utf8")) as UpdatesState;
    } catch (error) {
      if (
        error instanceof SyntaxError ||
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return {};
      }
      throw error;
    }
  };

  const write = async (next: UpdatesState): Promise<void> => {
    const temporaryPath = `${statePath}.${process.pid}.${randomUUID()}.tmp`;
    await mkdir(settingsDir, { recursive: true });
    try {
      await writeFile(
        temporaryPath,
        `${JSON.stringify(next, null, 2)}\n`,
        "utf8"
      );
      await rename(temporaryPath, statePath);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }
  };

  const merge = (
    patch: UpdatesState | ((state: UpdatesState) => UpdatesState)
  ): Promise<void> => {
    const operation = mutationQueue.then(async () => {
      const state = await load();
      await write({
        ...state,
        ...(typeof patch === "function" ? patch(state) : patch),
      });
    });
    mutationQueue = operation.catch(() => undefined);
    return operation;
  };

  return {
    async getUpdateMode() {
      const mode = (await load()).mode;
      return mode && VALID_MODES.includes(mode) ? mode : DEFAULT_UPDATE_MODE;
    },
    setUpdateMode(mode) {
      return merge({ mode });
    },
    async getLastSeenHash(identifier) {
      return (await load()).lastSeenHashes?.[identifier];
    },
    setLastSeenHash(identifier, hash) {
      return merge((state) => ({
        lastSeenHashes: { ...state.lastSeenHashes, [identifier]: hash },
      }));
    },
  };
}

const defaultStore = createUpdatesStateStore(getSettingsDir());

export const getUpdateMode = () => defaultStore.getUpdateMode();
export const setUpdateMode = (mode: UpdateMode) =>
  defaultStore.setUpdateMode(mode);
export const getLastSeenHash = (identifier: string) =>
  defaultStore.getLastSeenHash(identifier);
export const setLastSeenHash = (identifier: string, hash: string) =>
  defaultStore.setLastSeenHash(identifier, hash);
