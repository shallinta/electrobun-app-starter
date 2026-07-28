export const applicationMenus: unknown[][] = [];
export const browserWindowListeners = new Map<string, () => void>();

let fakeBrowserWindowFullScreen = false;

export function resetFakeBrowserWindow(): void {
  browserWindowListeners.clear();
  fakeBrowserWindowFullScreen = false;
}

export function setFakeBrowserWindowFullScreen(value: boolean): void {
  fakeBrowserWindowFullScreen = value;
}

export const fakeBrowserWindow = {
  getFrame: () => ({ x: 0, y: 0, width: 800, height: 600 }),
  getPageZoom: () => 1,
  isFullScreen: () => fakeBrowserWindowFullScreen,
  isMaximized: () => false,
  maximize: () => undefined,
  unmaximize: () => undefined,
  on: (event: string, listener: () => void) =>
    browserWindowListeners.set(event, listener),
  setFullScreen: (value: boolean) => {
    fakeBrowserWindowFullScreen = value;
  },
  setPageZoom: () => undefined,
  webview: { on: () => undefined },
};

export const fakeUpdater = {
  applyUpdate: () => Promise.resolve(),
  checkForUpdate: () =>
    Promise.resolve({ error: null, updateAvailable: false, version: "1.0.0" }),
  downloadUpdate: () => Promise.resolve(),
  getLocalInfo: () =>
    Promise.resolve({
      channel: "stable",
      hash: "hash",
      identifier: "app.test",
      version: "1.0.0",
    }),
  localInfo: { channel: () => Promise.resolve("stable") },
  updateInfo: () => ({ updateReady: true }),
};

export const electrobunBunMock = {
  app: { on: () => undefined },
  ApplicationMenu: {
    on: () => undefined,
    setApplicationMenu: (menu: unknown[]) => applicationMenus.push(menu),
  },
  BrowserWindow: class {
    constructor() {
      return fakeBrowserWindow;
    }
  },
  BrowserView: {
    defineRPC: (definition: unknown) => definition,
  },
  Updater: fakeUpdater,
};
