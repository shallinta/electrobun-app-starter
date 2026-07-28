import { Updater } from "electrobun/bun";

import type { UpdateMode, UpdateStatus } from "../../shared/updates";
import { setUpdateModeInMenu, setUpdateReadyInMenu } from "../app/menu";

import {
  getLastSeenHash,
  getUpdateMode,
  setLastSeenHash,
  setUpdateMode as persistUpdateMode,
} from "./state";

const INITIAL_CHECK_DELAY_MS = 30_000;
const CHECK_INTERVAL_MS = 4 * 60 * 60_000;
const APPLY_GRACE_MS = 5_000;

export interface UpdateStatusMessage {
  status: UpdateStatus;
  manual: boolean;
}

interface UpdaterDependencies {
  updater: typeof Updater;
  getLastSeenHash: typeof getLastSeenHash;
  getUpdateMode: typeof getUpdateMode;
  persistUpdateMode: typeof persistUpdateMode;
  setLastSeenHash: typeof setLastSeenHash;
  setUpdateModeInMenu: typeof setUpdateModeInMenu;
  setUpdateReadyInMenu: typeof setUpdateReadyInMenu;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  setInterval: typeof setInterval;
  clearInterval: typeof clearInterval;
}

const DEFAULT_DEPENDENCIES: UpdaterDependencies = {
  updater: Updater,
  getLastSeenHash,
  getUpdateMode,
  persistUpdateMode,
  setLastSeenHash,
  setUpdateModeInMenu,
  setUpdateReadyInMenu,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
};

/** Process-scoped updater state and scheduling. */
export class UpdaterService {
  private _isCheckInFlight = false;
  private _isPassManual = false;
  private _lastStatus: UpdateStatus | null = null;
  private _installedVersion: string | null = null;
  private _backgroundTimer: ReturnType<typeof setTimeout> | null = null;
  private _backgroundInterval: ReturnType<typeof setInterval> | null = null;
  private _applyGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private _applyPromise: Promise<void> | null = null;

  constructor(
    private readonly _sendUpdateStatus: (message: UpdateStatusMessage) => void,
    private readonly _dependencies: UpdaterDependencies = DEFAULT_DEPENDENCIES
  ) {}

  async checkForUpdates(manual: boolean): Promise<void> {
    if (this._isCheckInFlight) {
      if (manual && !this._isPassManual) {
        this._isPassManual = true;
        if (this._lastStatus) this._sendStatus(this._lastStatus);
      }
      return;
    }
    this._isCheckInFlight = true;
    this._isPassManual = manual;
    try {
      if ((await this._dependencies.getUpdateMode()) === "off") return;
      this._sendStatus({ state: "checking" });
      const info = await this._dependencies.updater.checkForUpdate();
      if (info.error) {
        this._sendStatus({ state: "error", message: info.error });
        return;
      }
      if (!info.updateAvailable) {
        this._dependencies.setUpdateReadyInMenu(null);
        const { version } = await this._dependencies.updater.getLocalInfo();
        this._sendStatus({ state: "up-to-date", version });
        return;
      }
      this._sendStatus({ state: "downloading", version: info.version });
      await this._dependencies.updater.downloadUpdate();
      if (!this._dependencies.updater.updateInfo()?.updateReady) {
        const message =
          this._dependencies.updater.updateInfo()?.error ||
          "download did not complete";
        this._sendStatus({ state: "error", message });
        return;
      }
      this._dependencies.setUpdateReadyInMenu(info.version);
      this._sendStatus({ state: "ready", version: info.version });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this._sendStatus({ state: "error", message });
    } finally {
      this._isCheckInFlight = false;
    }
  }

  applyUpdateAndRestart(): Promise<void> {
    this._applyPromise ??= this._applyUpdateAndRestart();
    return this._applyPromise;
  }

  private async _applyUpdateAndRestart(): Promise<void> {
    try {
      await this._dependencies.updater.applyUpdate();
    } catch (error) {
      this._isPassManual = true;
      const message = error instanceof Error ? error.message : String(error);
      this._sendStatus({ state: "error", message });
      this._applyPromise = null;
      return;
    }
    this._applyGraceTimer = this._dependencies.setTimeout(() => {
      this._applyGraceTimer = null;
      void this.checkForUpdates(true).finally(() => {
        this._applyPromise = null;
      });
    }, APPLY_GRACE_MS);
  }

  getInstalledVersion(): string | null {
    const version = this._installedVersion;
    this._installedVersion = null;
    return version;
  }

  async getUpdateModeSetting(): Promise<UpdateMode> {
    return this._dependencies.getUpdateMode();
  }

  async setUpdateModeSetting(mode: UpdateMode): Promise<void> {
    await this._dependencies.persistUpdateMode(mode);
    this._applySchedule(mode);
  }

  async start(): Promise<void> {
    try {
      const { channel, hash, version, identifier } =
        await this._dependencies.updater.getLocalInfo();
      if (channel === "dev") return;

      const lastSeen = await this._dependencies.getLastSeenHash(identifier);
      if (lastSeen && lastSeen !== hash) this._installedVersion = version;
      if (lastSeen !== hash) {
        await this._dependencies.setLastSeenHash(identifier, hash);
      }

      this._applySchedule(await this._dependencies.getUpdateMode());
    } catch (error) {
      console.error(
        "Failed to start updater:",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  stop(): void {
    this._clearSchedule();
    if (this._applyGraceTimer) {
      this._dependencies.clearTimeout(this._applyGraceTimer);
      this._applyGraceTimer = null;
    }
    this._applyPromise = null;
  }

  private _sendStatus(status: UpdateStatus): void {
    this._lastStatus = status;
    this._sendUpdateStatus({ status, manual: this._isPassManual });
  }

  private _clearSchedule(): void {
    if (this._backgroundTimer) {
      this._dependencies.clearTimeout(this._backgroundTimer);
    }
    if (this._backgroundInterval) {
      this._dependencies.clearInterval(this._backgroundInterval);
    }
    this._backgroundTimer = null;
    this._backgroundInterval = null;
  }

  private _applySchedule(mode: UpdateMode): void {
    this._clearSchedule();
    this._dependencies.setUpdateModeInMenu(mode);
    if (mode !== "automatic") return;
    this._backgroundTimer = this._dependencies.setTimeout(
      () => void this.checkForUpdates(false),
      INITIAL_CHECK_DELAY_MS
    );
    this._backgroundInterval = this._dependencies.setInterval(
      () => void this.checkForUpdates(false),
      CHECK_INTERVAL_MS
    );
  }
}
