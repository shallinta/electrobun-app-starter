import { expect, mock, test } from "bun:test";

let requestCalls = 0;
let listenerCalls = 0;
const rpc = {
  request: {
    isFullScreen: () => {
      requestCalls += 1;
      return Promise.resolve({ fullScreen: false });
    },
  },
  addMessageListener: () => {
    listenerCalls += 1;
  },
  removeMessageListener: () => undefined,
};

await mock.module("electrobun/view", () => ({
  Electroview: class {
    static defineRPC() {
      return rpc;
    }

    rpc = rpc;
  },
}));

test("exports the full-screen hook without starting RPC observation", async () => {
  const modulePath = "./use-full-screen";
  const hookModule = (await import(modulePath).catch(() => ({}))) as {
    useFullScreen?: unknown;
  };

  expect(hookModule.useFullScreen).toBeFunction();
  expect(requestCalls).toBe(0);
  expect(listenerCalls).toBe(0);
});
