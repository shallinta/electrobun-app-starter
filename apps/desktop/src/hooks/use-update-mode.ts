"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { electrobun } from "@/lib/electrobun";
import { createUpdateModeStore } from "@/lib/update-mode-store";
import type { UpdateMode } from "@/shared/updates";

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

export function useUpdateMode(): {
  mode: UpdateMode;
  isSaving: boolean;
  change: (mode: UpdateMode) => Promise<void>;
} {
  const { t } = useTranslation("updates");
  const snapshot = useSyncExternalStore(
    (listener) => updateModeStore.subscribe(listener),
    () => updateModeStore.getSnapshot(),
    () => updateModeStore.getSnapshot()
  );

  useEffect(() => {
    loadPromise ??= updateModeStore.load().catch((error) => {
      loadPromise = null;
      const message = t("errors.loadSettings");
      toast.error(message);
      console.error(message, error);
    });
  }, [t]);

  const change = useCallback(
    async (mode: UpdateMode) => {
      try {
        await updateModeStore.change(mode);
      } catch (error) {
        const message = t("errors.saveSettings");
        toast.error(message);
        console.error(message, error);
      }
    },
    [t]
  );

  return { ...snapshot, change };
}
