export interface FullScreenRPC {
  request: {
    isFullScreen(
      params: Record<string, never>
    ): Promise<{ fullScreen: boolean }>;
  };
  addMessageListener(
    message: "fullScreenChanged",
    listener: (payload: { fullScreen: boolean }) => void
  ): void;
  removeMessageListener(
    message: "fullScreenChanged",
    listener: (payload: { fullScreen: boolean }) => void
  ): void;
}

export interface FullScreenStore {
  getSnapshot(): boolean;
  subscribe(listener: () => void): () => void;
}

export function createFullScreenStore(rpc: FullScreenRPC): FullScreenStore {
  let snapshot = false;
  let generation = 0;
  let messageVersion = 0;
  const listeners = new Set<() => void>();
  const update = (fullScreen: boolean): void => {
    if (fullScreen === snapshot) return;
    snapshot = fullScreen;
    for (const listener of listeners) listener();
  };
  const handleFullScreenChanged = ({
    fullScreen,
  }: {
    fullScreen: boolean;
  }): void => {
    messageVersion += 1;
    update(fullScreen);
  };

  const start = (): void => {
    const activeGeneration = ++generation;
    rpc.addMessageListener("fullScreenChanged", handleFullScreenChanged);
    const initialMessageVersion = messageVersion;
    let initial: Promise<{ fullScreen: boolean }>;
    try {
      initial = rpc.request.isFullScreen({});
    } catch {
      return;
    }
    void initial
      .then(({ fullScreen }) => {
        if (
          generation !== activeGeneration ||
          listeners.size === 0 ||
          messageVersion !== initialMessageVersion
        ) {
          return;
        }
        update(fullScreen);
      })
      .catch(() => undefined);
  };

  const stop = (): void => {
    generation += 1;
    rpc.removeMessageListener("fullScreenChanged", handleFullScreenChanged);
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      const shouldStart = listeners.size === 0;
      listeners.add(listener);
      if (shouldStart) start();
      return () => {
        if (!listeners.delete(listener)) return;
        if (listeners.size === 0) stop();
      };
    },
  };
}
