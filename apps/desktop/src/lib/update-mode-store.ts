import { DEFAULT_UPDATE_MODE, type UpdateMode } from "../shared/updates";

export interface UpdateModeSnapshot {
  mode: UpdateMode;
  isSaving: boolean;
}

export interface UpdateModeStore {
  getSnapshot(): UpdateModeSnapshot;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  change(mode: UpdateMode): Promise<void>;
}

export function createUpdateModeStore({
  loadMode,
  persistMode,
}: {
  loadMode: () => Promise<UpdateMode>;
  persistMode: (mode: UpdateMode) => Promise<void>;
}): UpdateModeStore {
  let snapshot: UpdateModeSnapshot = {
    mode: DEFAULT_UPDATE_MODE,
    isSaving: false,
  };
  const listeners = new Set<() => void>();
  const update = (next: UpdateModeSnapshot): void => {
    snapshot = next;
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async load() {
      update({ mode: await loadMode(), isSaving: false });
    },
    async change(mode) {
      const previousMode = snapshot.mode;
      update({ mode, isSaving: true });
      try {
        await persistMode(mode);
        update({ mode, isSaving: false });
      } catch (error) {
        update({ mode: previousMode, isSaving: false });
        throw error;
      }
    },
  };
}
