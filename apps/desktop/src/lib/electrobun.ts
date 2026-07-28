import { Electroview } from "electrobun/view";

import type { DesktopRPCType } from "../shared/rpc";

// Electrobun's RPC (rpc-anywhere) defaults `maxRequestTime` to 1000ms, so any
// renderer→bun request that takes longer than a second rejects with
// "RPC request timed out." Keep the renderer ceiling aligned with the bun side
// so shell RPCs share one predictable timeout policy.
const MAX_REQUEST_TIME_MS = 5 * 60_000 + 10_000;

const rpc = Electroview.defineRPC<DesktopRPCType>({
  maxRequestTime: MAX_REQUEST_TIME_MS,
  handlers: { requests: {}, messages: {} },
});

export const electrobun = new Electroview({ rpc });
