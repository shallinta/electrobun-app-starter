"use client";

import { useSyncExternalStore } from "react";

import { electrobun } from "@/lib/electrobun";
import {
  createFullScreenStore,
  type FullScreenRPC,
} from "@/lib/full-screen-store";

function getRpc() {
  const rpc = electrobun.rpc;
  if (!rpc) throw new Error("Desktop RPC is unavailable.");
  return rpc;
}

const fullScreenRPC: FullScreenRPC = {
  request: {
    isFullScreen: (params) => getRpc().request.isFullScreen(params),
  },
  addMessageListener: (message, listener) =>
    getRpc().addMessageListener(message, listener),
  removeMessageListener: (message, listener) =>
    getRpc().removeMessageListener(message, listener),
};

const fullScreenStore = createFullScreenStore(fullScreenRPC);

export function useFullScreen(): boolean {
  return useSyncExternalStore(
    (listener) => fullScreenStore.subscribe(listener),
    () => fullScreenStore.getSnapshot(),
    () => fullScreenStore.getSnapshot()
  );
}
