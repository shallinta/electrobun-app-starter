import { beforeEach, expect, mock, test } from "bun:test";

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { UpdateMode } from "@/shared/updates";

let readyVersion: string | null = null;
let updateMode: UpdateMode = "automatic";

await mock.module("@/commands", () => ({
  useCommands: () => ({ executeCommand: () => undefined }),
}));

await mock.module("@/components/update-status-provider", () => ({
  useUpdateStatus: () => ({ readyVersion }),
}));

await mock.module("@/hooks/use-update-mode", () => ({
  useUpdateMode: () => ({ mode: updateMode }),
}));

await mock.module("@shallinta/ui/ui/command", () => {
  const Wrapper = ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  );
  return {
    Command: Wrapper,
    CommandDialog: Wrapper,
    CommandEmpty: Wrapper,
    CommandInput: () => <input aria-label="Search commands" />,
    CommandItem: ({
      children,
    }: {
      children?: ReactNode;
      onSelect?: () => void;
    }) => <div>{children}</div>,
    CommandList: Wrapper,
  };
});

const { CommandPalette } = await import("./command-palette");

beforeEach(() => {
  readyVersion = null;
  updateMode = "automatic";
});

function renderPalette() {
  return renderToStaticMarkup(
    <CommandPalette open onOpenChange={() => undefined} />
  );
}

test("hides restart command until an update is ready", () => {
  readyVersion = null;

  expect(renderPalette()).not.toContain("Restart to Update");
});

test("shows restart command when an update is ready", () => {
  readyVersion = "0.2.0";

  expect(renderPalette()).toContain("Restart to Update");
});

test("hides check command while update mode is off", () => {
  updateMode = "off";

  expect(renderPalette()).not.toContain("Check for Updates");
});
