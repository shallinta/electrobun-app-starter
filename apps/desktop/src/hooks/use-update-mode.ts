"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { electrobun } from "@/lib/electrobun";
import { createUpdateModeStore } from "@/lib/update-mode-store";
import type { UpdateMode } from "@/shared/updates";

const SAVE_ERROR_MESSAGE = "Couldn’t save software update settings.";
const LOAD_ERROR_MESSAGE = "Couldn’t load software update settings.";

function getRpc() {
  const rpc = electrobun.rpc;
  if (!rpc) throw new Error("Desktop RPC is unavailable.");
  return rpc;
}

const updateModeStore = createUpdateModeStore({
  loadMode: () => getRpc().request.updateMode({}),
  persistMode: async (mode) => {
    await getRpc().request.setUpdateMode({ mode });
  },
});

let loadPromise: Promise<void> | null = null;

function ensureUpdateModeLoaded(): Promise<void> {
  loadPromise ??= updateModeStore.load().catch((error) => {
    loadPromise = null;
    toast.error(LOAD_ERROR_MESSAGE);
    console.error(LOAD_ERROR_MESSAGE, error);
  });
  return loadPromise;
}

export function useUpdateMode(): {
  mode: UpdateMode;
  isSaving: boolean;
  change: (mode: UpdateMode) => Promise<void>;
} {
  const snapshot = useSyncExternalStore(
    (listener) => updateModeStore.subscribe(listener),
    () => updateModeStore.getSnapshot(),
    () => updateModeStore.getSnapshot()
  );

  useEffect(() => {
    void ensureUpdateModeLoaded();
  }, []);

  const change = useCallback(async (mode: UpdateMode) => {
    try {
      await updateModeStore.change(mode);
    } catch (error) {
      toast.error(SAVE_ERROR_MESSAGE);
      console.error(SAVE_ERROR_MESSAGE, error);
    }
  }, []);

  return { ...snapshot, change };
}
