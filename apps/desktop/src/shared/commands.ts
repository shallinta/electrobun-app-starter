/** Base shape for every command. */
export interface GenericCommand<T extends string, A = Record<string, never>> {
  type: T;
  args: A;
}

export type SettingsTab = "general" | "about";

export interface OpenSettingsCommand extends GenericCommand<
  "openSettings",
  { tab?: SettingsTab }
> {}

export interface OpenCommandPaletteCommand extends GenericCommand<"openCommandPalette"> {}
export interface ToggleSidebarCommand extends GenericCommand<"toggleSidebar"> {}
export interface ZoomInCommand extends GenericCommand<"zoomIn"> {}
export interface ZoomOutCommand extends GenericCommand<"zoomOut"> {}
export interface ResetZoomCommand extends GenericCommand<"resetZoom"> {}
export interface ReloadCommand extends GenericCommand<"reload"> {}
export interface ToggleMaximizedCommand extends GenericCommand<"toggleMaximized"> {}

export interface OpenLinkCommand extends GenericCommand<
  "openLink",
  { url: string }
> {}

export interface CheckForUpdatesCommand extends GenericCommand<"checkForUpdates"> {}
export interface ApplyUpdateAndRestartCommand extends GenericCommand<"applyUpdateAndRestart"> {}

export type Command =
  | OpenSettingsCommand
  | OpenCommandPaletteCommand
  | ToggleSidebarCommand
  | ZoomInCommand
  | ZoomOutCommand
  | ResetZoomCommand
  | ReloadCommand
  | ToggleMaximizedCommand
  | OpenLinkCommand
  | CheckForUpdatesCommand
  | ApplyUpdateAndRestartCommand;

export type CommandType = Command["type"];
export type CommandArgs<T extends CommandType> = Extract<
  Command,
  { type: T }
>["args"];

export const COMMAND_META: Record<
  CommandType,
  { label: string; target: "webview" | "bun" }
> = {
  openSettings: { label: "Settings", target: "webview" },
  openCommandPalette: { label: "Command Palette", target: "webview" },
  toggleSidebar: { label: "Toggle Sidebar", target: "webview" },
  zoomIn: { label: "Zoom In", target: "bun" },
  zoomOut: { label: "Zoom Out", target: "bun" },
  resetZoom: { label: "Reset Zoom", target: "bun" },
  reload: { label: "Reload", target: "bun" },
  toggleMaximized: { label: "Toggle Maximize", target: "bun" },
  openLink: { label: "Open Link", target: "bun" },
  checkForUpdates: { label: "Check for Updates...", target: "bun" },
  applyUpdateAndRestart: { label: "Restart to Update", target: "bun" },
};
