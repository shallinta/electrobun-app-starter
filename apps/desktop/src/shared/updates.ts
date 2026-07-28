/**
 * Update-flow status pushed from the bun process to the renderer over the
 * `updateStatusChanged` RPC message. `manual` marks flows started by an
 * explicit user action; those surface feedback (checking / up-to-date / errors)
 * that automatic background checks keep silent.
 */
export type UpdateStatus =
  | { state: "checking" }
  | { state: "up-to-date"; version: string }
  | { state: "downloading"; version: string }
  | { state: "ready"; version: string }
  | { state: "error"; message: string };

export interface UpdateStatusChangedPayload {
  status: UpdateStatus;
  manual: boolean;
}

/**
 * How the background updater behaves. `automatic`: check + download silently
 * (user-initiated checks still work). `manual`: never check on a timer — only
 * in response to an explicit user-initiated check. `off`: never check at all.
 * The mode is owned by the bun process (it must decide before the renderer
 * exists) and persisted in `settings/updates.json`.
 */
export type UpdateMode = "automatic" | "manual" | "off";

export const DEFAULT_UPDATE_MODE: UpdateMode = "automatic";
