import { expect, test } from "bun:test";

import {
  createUpdateModeStore,
  type UpdateModeSnapshot,
} from "./update-mode-store";

test("provides a reusable update-mode external store factory", async () => {
  const modulePath = "./update-mode-store";
  const storeModule = (await import(modulePath).catch(() => ({}))) as {
    createUpdateModeStore?: unknown;
  };

  expect(storeModule.createUpdateModeStore).toBeFunction();
});

test("broadcasts optimistic mode and failure rollback to every subscriber", async () => {
  let rejectPersist: ((error: Error) => void) | undefined;
  const persist = new Promise<void>((_resolve, reject) => {
    rejectPersist = reject;
  });
  const store = createUpdateModeStore({
    loadMode: () => Promise.resolve("automatic"),
    persistMode: () => persist,
  });
  const first: UpdateModeSnapshot[] = [];
  const second: UpdateModeSnapshot[] = [];
  store.subscribe(() => first.push(store.getSnapshot()));
  store.subscribe(() => second.push(store.getSnapshot()));

  const change = store.change("off");
  expect(store.getSnapshot()).toEqual({ mode: "off", isSaving: true });
  rejectPersist?.(new Error("disk full"));
  let caught: unknown;
  try {
    await change;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error).message).toBe("disk full");

  const expected: UpdateModeSnapshot[] = [
    { mode: "off", isSaving: true },
    { mode: "automatic", isSaving: false },
  ];
  expect(first).toEqual(expected);
  expect(second).toEqual(expected);
});
