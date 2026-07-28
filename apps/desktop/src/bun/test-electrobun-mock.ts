export const applicationMenus: unknown[][] = [];

export const fakeBrowserWindow = {
  getFrame: () => ({ x: 0, y: 0, width: 800, height: 600 }),
  getPageZoom: () => 1,
  isFullScreen: () => false,
  isMaximized: () => false,
  maximize: () => undefined,
  on: () => undefined,
  setFullScreen: () => undefined,
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
  Updater: fakeUpdater,
};
