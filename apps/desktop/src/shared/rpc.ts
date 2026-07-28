import type { RPCSchema } from "electrobun";

import type { Command } from "./commands";
import type { UpdateMode, UpdateStatusChangedPayload } from "./updates";

export interface DesktopRPCType {
  bun: RPCSchema<{
    requests: {
      updateMode: { params: Record<string, never>; response: UpdateMode };
      setUpdateMode: { params: { mode: UpdateMode }; response: null };
      pendingInstalledVersion: {
        params: Record<string, never>;
        response: string | null;
      };
      isFullScreen: {
        params: Record<string, never>;
        response: { fullScreen: boolean };
      };
    };
    messages: {
      executeCommand: Command;
    };
  }>;
  webview: RPCSchema<{
    requests: Record<string, never>;
    messages: {
      updateStatusChanged: UpdateStatusChangedPayload;
      executeCommand: Command;
      fullScreenChanged: { fullScreen: boolean };
    };
  }>;
}
