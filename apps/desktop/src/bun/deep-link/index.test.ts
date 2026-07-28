import { describe, expect, test } from "bun:test";

import {
  createDeepLinkBuffer,
  parseDeepLink,
  registerDeepLinkCapture,
} from "./index";

const RULES = {
  scheme: "starter",
  hosts: ["open"],
  path: /\/items\/[^/]+/,
} as const;

describe("parseDeepLink", () => {
  test.each(["starter", "starter:"])(
    "accepts the configured scheme in %s form",
    (scheme) => {
      expect(
        parseDeepLink("starter://open/items/123", {
          ...RULES,
          scheme,
        }).href
      ).toBe("starter://open/items/123");
    }
  );

  test("rejects a scheme that only starts with the configured value", () => {
    expect(() =>
      parseDeepLink("starter-extra://open/items/123", RULES)
    ).toThrow("Deep link is not allowed.");
  });

  test("allows only exact configured hosts", () => {
    expect(parseDeepLink("starter://open/items/123", RULES).hostname).toBe(
      "open"
    );
    expect(() =>
      parseDeepLink("starter://open.attacker.test/items/123", RULES)
    ).toThrow("Deep link is not allowed.");
  });

  test("requires the path expression to match the entire pathname", () => {
    expect(parseDeepLink("starter://open/items/123", RULES).pathname).toBe(
      "/items/123"
    );
    expect(() =>
      parseDeepLink("starter://open/prefix/items/123", RULES)
    ).toThrow("Deep link is not allowed.");
    expect(() =>
      parseDeepLink("starter://open/items/123/suffix", RULES)
    ).toThrow("Deep link is not allowed.");
  });

  test("does not leak input when rejecting malformed or oversized values", () => {
    const values = [
      "private malformed input",
      `starter://open/items/${"secret".repeat(400)}`,
    ];

    for (const value of values) {
      try {
        parseDeepLink(value, { ...RULES, maxLength: 128 });
        throw new Error("Expected parseDeepLink to reject the value.");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Deep link is not allowed.");
        expect(String(error)).not.toContain(value);
      }
    }
  });

  test("does not retain state from global or sticky path expressions", () => {
    const rules = { ...RULES, path: /\/items\/[^/]+/gy };

    expect(parseDeepLink("starter://open/items/1", rules).pathname).toBe(
      "/items/1"
    );
    expect(parseDeepLink("starter://open/items/2", rules).pathname).toBe(
      "/items/2"
    );
  });
});

describe("createDeepLinkBuffer", () => {
  test("rejects invalid links without delivering them", () => {
    const buffer = createDeepLinkBuffer({ rules: RULES });
    const received: string[] = [];

    expect(buffer.capture("https://open/items/1")).toBe(false);
    buffer.setHandler((url) => received.push(url.href));

    expect(received).toEqual([]);
  });

  test("keeps a bounded FIFO and drops the oldest pending link", () => {
    const buffer = createDeepLinkBuffer({ rules: RULES, maxPending: 2 });
    const received: string[] = [];

    buffer.capture("starter://open/items/1");
    buffer.capture("starter://open/items/2");
    buffer.capture("starter://open/items/3");
    buffer.setHandler((url) => received.push(url.pathname));

    expect(received).toEqual(["/items/2", "/items/3"]);
  });

  test("deduplicates normalized pending links", () => {
    const buffer = createDeepLinkBuffer({ rules: RULES });
    const received: string[] = [];

    expect(buffer.capture("starter://open/items/./1")).toBe(true);
    expect(buffer.capture("starter://open/items/1")).toBe(true);
    buffer.setHandler((url) => received.push(url.href));

    expect(received).toEqual(["starter://open/items/1"]);
  });

  test("flushes cold-start links in order and clears the queue", () => {
    const buffer = createDeepLinkBuffer({ rules: RULES });
    const firstHandler: string[] = [];
    const replacementHandler: string[] = [];

    buffer.capture("starter://open/items/1");
    buffer.capture("starter://open/items/2");
    buffer.setHandler((url) => firstHandler.push(url.pathname));
    buffer.setHandler((url) => replacementHandler.push(url.pathname));

    expect(firstHandler).toEqual(["/items/1", "/items/2"]);
    expect(replacementHandler).toEqual([]);
  });

  test("uses a replacement handler for the rest of a reentrant flush", () => {
    const buffer = createDeepLinkBuffer({ rules: RULES });
    const firstHandler: string[] = [];
    const replacementHandler: string[] = [];

    buffer.capture("starter://open/items/1");
    buffer.capture("starter://open/items/2");
    buffer.setHandler((url) => {
      firstHandler.push(url.pathname);
      buffer.setHandler((nextUrl) => replacementHandler.push(nextUrl.pathname));
    });

    expect(firstHandler).toEqual(["/items/1"]);
    expect(replacementHandler).toEqual(["/items/2"]);
  });

  test("keeps the rest pending when a handler clears during flush", () => {
    const buffer = createDeepLinkBuffer({ rules: RULES });
    const firstHandler: string[] = [];
    const replacementHandler: string[] = [];

    buffer.capture("starter://open/items/1");
    buffer.capture("starter://open/items/2");
    buffer.setHandler((url) => {
      firstHandler.push(url.pathname);
      buffer.clearHandler();
    });

    expect(firstHandler).toEqual(["/items/1"]);

    buffer.setHandler((url) => replacementHandler.push(url.pathname));

    expect(replacementHandler).toEqual(["/items/2"]);
  });

  test("delivers warm links immediately to the current handler", () => {
    const buffer = createDeepLinkBuffer({ rules: RULES });
    const firstHandler: string[] = [];
    const replacementHandler: string[] = [];

    buffer.setHandler((url) => firstHandler.push(url.pathname));
    buffer.capture("starter://open/items/1");
    buffer.setHandler((url) => replacementHandler.push(url.pathname));
    buffer.capture("starter://open/items/2");
    buffer.clearHandler();
    buffer.capture("starter://open/items/3");
    buffer.setHandler((url) => replacementHandler.push(url.pathname));

    expect(firstHandler).toEqual(["/items/1"]);
    expect(replacementHandler).toEqual(["/items/2", "/items/3"]);
  });

  test("continues after a handler throws and remains usable", () => {
    const buffer = createDeepLinkBuffer({ rules: RULES });
    const attempted: string[] = [];
    const received: string[] = [];

    buffer.capture("starter://open/items/1");
    buffer.capture("starter://open/items/2");
    buffer.setHandler((url) => {
      attempted.push(url.pathname);
      throw new Error("consumer failed");
    });
    buffer.setHandler((url) => received.push(url.pathname));

    expect(attempted).toEqual(["/items/1", "/items/2"]);
    expect(buffer.capture("starter://open/items/3")).toBe(true);
    expect(received).toEqual(["/items/3"]);
  });
});

describe("registerDeepLinkCapture", () => {
  test("registers only when called and cleanup removes the listener", () => {
    type Listener = (event: { data: { url: string } }) => void;
    let listener: Listener | undefined;
    const registrations: string[] = [];
    const removals: string[] = [];
    const events = {
      on(event: "open-url", nextListener: Listener) {
        registrations.push(event);
        listener = nextListener;
      },
      off(event: "open-url", removedListener: Listener) {
        removals.push(event);
        expect(removedListener === listener).toBe(true);
      },
    };
    const buffer = createDeepLinkBuffer({ rules: RULES });
    const received: string[] = [];

    buffer.setHandler((url) => received.push(url.href));
    expect(registrations).toEqual([]);

    const cleanup = registerDeepLinkCapture(events, buffer);
    listener?.({ data: { url: "starter://open/items/1" } });
    cleanup();

    expect(registrations).toEqual(["open-url"]);
    expect(removals).toEqual(["open-url"]);
    expect(received).toEqual(["starter://open/items/1"]);
  });

  test("supports event sources without an off method", () => {
    let registered = false;
    const events = {
      on(
        event: "open-url",
        listener: (event: { data: { url: string } }) => void
      ) {
        registered = event === "open-url" && typeof listener === "function";
      },
    };
    const buffer = createDeepLinkBuffer({ rules: RULES });

    expect(() => registerDeepLinkCapture(events, buffer)()).not.toThrow();
    expect(registered).toBe(true);
  });
});
