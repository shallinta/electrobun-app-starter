export const LOCAL_STORAGE_KEYS = {
  theme: "electrobun-app-starter-theme",
  primaryColor: "electrobun-app-starter-primary",
  sidebarSize: "electrobun-app-starter:sidebar-size",
} as const;

export type LocalStorageKey =
  (typeof LOCAL_STORAGE_KEYS)[keyof typeof LOCAL_STORAGE_KEYS];

function _getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readLocalStorage(key: LocalStorageKey): string | null {
  try {
    return _getLocalStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeLocalStorage(
  key: LocalStorageKey,
  value: string
): boolean {
  const storage = _getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocalStorage(key: LocalStorageKey): boolean {
  const storage = _getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
