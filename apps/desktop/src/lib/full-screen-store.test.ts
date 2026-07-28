import { expect, test } from "bun:test";

import { createFullScreenStore, type FullScreenRPC } from "./full-screen-store";

test("provides a reusable full-screen external store factory", async () => {
  const modulePath = "./full-screen-store";
  const storeModule = (await import(modulePath).catch(() => ({}))) as {
    createFullScreenStore?: unknown;
  };

  expect(storeModule.createFullScreenStore).toBeFunction();
});

test("starts RPC observation for the first subscriber and stops after the last", async () => {
  let resolveInitial: ((value: { fullScreen: boolean }) => void) | undefined;
  const initial = new Promise<{ fullScreen: boolean }>((resolve) => {
    resolveInitial = resolve;
  });
  let requestCalls = 0;
  let addCalls = 0;
  let removeCalls = 0;
  let messageHandler: ((payload: { fullScreen: boolean }) => void) | undefined;
  const rpc: FullScreenRPC = {
    request: {
      isFullScreen: () => {
        requestCalls += 1;
        return initial;
      },
    },
    addMessageListener: (_message, listener) => {
      addCalls += 1;
      messageHandler = listener;
    },
    removeMessageListener: (_message, listener) => {
      removeCalls += 1;
      expect(listener).toBe(messageHandler!);
    },
  };
  const store = createFullScreenStore(rpc);
  let firstNotifications = 0;
  let secondNotifications = 0;

  const unsubscribeFirst = store.subscribe(() => {
    firstNotifications += 1;
  });
  const unsubscribeSecond = store.subscribe(() => {
    secondNotifications += 1;
  });

  expect(requestCalls).toBe(1);
  expect(addCalls).toBe(1);
  resolveInitial?.({ fullScreen: true });
  await Promise.resolve();
  expect(store.getSnapshot()).toBe(true);
  expect(firstNotifications).toBe(1);
  expect(secondNotifications).toBe(1);

  unsubscribeFirst();
  expect(removeCalls).toBe(0);
  unsubscribeSecond();
  expect(removeCalls).toBe(1);
});

test("notifies subscribers only when a full-screen value changes", () => {
  let messageHandler: ((payload: { fullScreen: boolean }) => void) | undefined;
  const rpc: FullScreenRPC = {
    request: {
      isFullScreen: () => new Promise(() => undefined),
    },
    addMessageListener: (_message, listener) => {
      messageHandler = listener;
    },
    removeMessageListener: () => undefined,
  };
  const store = createFullScreenStore(rpc);
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });

  messageHandler?.({ fullScreen: false });
  messageHandler?.({ fullScreen: true });
  messageHandler?.({ fullScreen: true });
  messageHandler?.({ fullScreen: false });

  expect(notifications).toBe(2);
  expect(store.getSnapshot()).toBe(false);
  unsubscribe();
});

test("does not let an older initial response overwrite a message", async () => {
  let resolveInitial:
    | ((value: { fullScreen: boolean }) => void)
    | undefined;
  const initial = new Promise<{ fullScreen: boolean }>((resolve) => {
    resolveInitial = resolve;
  });
  let messageHandler:
    | ((payload: { fullScreen: boolean }) => void)
    | undefined;
  const rpc: FullScreenRPC = {
    request: {
      isFullScreen: () => initial,
    },
    addMessageListener: (_message, listener) => {
      messageHandler = listener;
    },
    removeMessageListener: () => undefined,
  };
  const store = createFullScreenStore(rpc);
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });

  messageHandler?.({ fullScreen: true });
  resolveInitial?.({ fullScreen: false });
  await Promise.resolve();

  expect(store.getSnapshot()).toBe(true);
  expect(notifications).toBe(1);
  unsubscribe();
});

test("ignores an initial response from an ended subscription generation", async () => {
  const pending: {
    promise: Promise<{ fullScreen: boolean }>;
    resolve: (value: { fullScreen: boolean }) => void;
  }[] = [];
  const rpc: FullScreenRPC = {
    request: {
      isFullScreen: () => {
        let resolve: ((value: { fullScreen: boolean }) => void) | undefined;
        const promise = new Promise<{ fullScreen: boolean }>(
          (resolvePromise) => {
            resolve = resolvePromise;
          }
        );
        const request = { promise, resolve: resolve! };
        pending.push(request);
        return promise;
      },
    },
    addMessageListener: () => undefined,
    removeMessageListener: () => undefined,
  };
  const store = createFullScreenStore(rpc);
  const unsubscribeFirst = store.subscribe(() => undefined);
  unsubscribeFirst();
  let notifications = 0;
  const unsubscribeSecond = store.subscribe(() => {
    notifications += 1;
  });

  pending[0]?.resolve({ fullScreen: true });
  await Promise.resolve();

  expect(store.getSnapshot()).toBe(false);
  expect(notifications).toBe(0);
  unsubscribeSecond();
});

test("keeps the default value when the initial request fails", async () => {
  const rpc: FullScreenRPC = {
    request: {
      isFullScreen: () => Promise.reject(new Error("RPC unavailable")),
    },
    addMessageListener: () => undefined,
    removeMessageListener: () => undefined,
  };
  const store = createFullScreenStore(rpc);
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });

  await Promise.resolve();
  await Promise.resolve();

  expect(store.getSnapshot()).toBe(false);
  expect(notifications).toBe(0);
  unsubscribe();
});
