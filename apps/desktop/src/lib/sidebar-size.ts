import {
  LOCAL_STORAGE_KEYS,
  readLocalStorage,
  writeLocalStorage,
} from "@shallinta/ui/lib/local-storage";

export const DEFAULT_SIDEBAR_SIZE = "20%";

export function readSidebarSize(): number | string {
  const persistedSize = Number(
    readLocalStorage(LOCAL_STORAGE_KEYS.sidebarSize)
  );

  if (!Number.isFinite(persistedSize) || persistedSize <= 0) {
    return DEFAULT_SIDEBAR_SIZE;
  }

  return persistedSize;
}

export function persistSidebarSize(sizeInPixels: number): void {
  if (!Number.isFinite(sizeInPixels) || sizeInPixels <= 0) {
    return;
  }

  writeLocalStorage(
    LOCAL_STORAGE_KEYS.sidebarSize,
    String(Math.round(sizeInPixels))
  );
}
