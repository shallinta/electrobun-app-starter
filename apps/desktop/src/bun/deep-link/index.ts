const DEFAULT_MAX_LENGTH = 2048;
const DEFAULT_MAX_PENDING = 16;
const DEEP_LINK_REJECTION_MESSAGE = "Deep link is not allowed.";

export interface DeepLinkRules {
  scheme: string;
  hosts?: readonly string[];
  path?: RegExp;
  maxLength?: number;
}

export interface DeepLinkBuffer {
  capture(raw: string): boolean;
  setHandler(handler: (url: URL) => void): void;
  clearHandler(): void;
}

interface DeepLinkEvent {
  data: {
    url: string;
  };
}

type DeepLinkEventListener = (event: DeepLinkEvent) => void;

interface DeepLinkEvents {
  on(event: "open-url", listener: DeepLinkEventListener): void;
  off?(event: "open-url", listener: DeepLinkEventListener): void;
}

function _rejectDeepLink(): never {
  throw new Error(DEEP_LINK_REJECTION_MESSAGE);
}

function _normalizeProtocol(scheme: string): string {
  const normalizedScheme = scheme.endsWith(":") ? scheme.slice(0, -1) : scheme;

  if (!/^[a-z][a-z\d+.-]*$/i.test(normalizedScheme)) {
    return _rejectDeepLink();
  }

  return `${normalizedScheme.toLowerCase()}:`;
}

function _matchesEntirePath(pathname: string, expression: RegExp): boolean {
  const statelessExpression = new RegExp(
    expression.source,
    expression.flags.replace(/[gy]/g, "")
  );
  const match = statelessExpression.exec(pathname);

  return match?.[0] === pathname;
}

export function parseDeepLink(raw: string, rules: DeepLinkRules): URL {
  const maxLength = rules.maxLength ?? DEFAULT_MAX_LENGTH;

  if (
    typeof raw !== "string" ||
    !Number.isInteger(maxLength) ||
    maxLength < 0 ||
    raw.length > maxLength
  ) {
    return _rejectDeepLink();
  }

  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    return _rejectDeepLink();
  }

  if (url.protocol !== _normalizeProtocol(rules.scheme)) {
    return _rejectDeepLink();
  }

  if (
    rules.hosts &&
    !rules.hosts.some((host) => host.toLowerCase() === url.hostname)
  ) {
    return _rejectDeepLink();
  }

  if (rules.path && !_matchesEntirePath(url.pathname, rules.path)) {
    return _rejectDeepLink();
  }

  return url;
}

function _deliver(handler: (url: URL) => void, url: URL): void {
  try {
    handler(url);
  } catch {
    // A consumer failure must not poison capture or prevent later delivery.
  }
}

export function createDeepLinkBuffer({
  rules,
  maxPending = DEFAULT_MAX_PENDING,
}: {
  rules: DeepLinkRules;
  maxPending?: number;
}): DeepLinkBuffer {
  if (!Number.isInteger(maxPending) || maxPending < 0) {
    throw new Error("maxPending must be a non-negative integer.");
  }

  const pending: URL[] = [];
  const pendingHrefs = new Set<string>();
  let handler: ((url: URL) => void) | undefined;
  let isFlushing = false;

  const flushPending = (): void => {
    if (isFlushing) {
      return;
    }

    isFlushing = true;

    try {
      while (pending.length > 0) {
        const activeHandler = handler;

        if (!activeHandler) {
          return;
        }

        const url = pending.shift();

        if (!url) {
          return;
        }

        pendingHrefs.delete(url.href);
        _deliver(activeHandler, url);
      }
    } finally {
      isFlushing = false;
    }
  };

  return {
    capture(raw) {
      let url: URL;

      try {
        url = parseDeepLink(raw, rules);
      } catch {
        return false;
      }

      if (handler) {
        _deliver(handler, url);
        return true;
      }

      if (pendingHrefs.has(url.href)) {
        return true;
      }

      if (maxPending === 0) {
        return true;
      }

      if (pending.length === maxPending) {
        const discarded = pending.shift();

        if (discarded) {
          pendingHrefs.delete(discarded.href);
        }
      }

      pending.push(url);
      pendingHrefs.add(url.href);
      return true;
    },

    setHandler(nextHandler) {
      handler = nextHandler;
      flushPending();
    },

    clearHandler() {
      handler = undefined;
    },
  };
}

export function registerDeepLinkCapture(
  events: DeepLinkEvents,
  buffer: DeepLinkBuffer
): () => void {
  const listener: DeepLinkEventListener = (event) => {
    buffer.capture(event.data.url);
  };

  events.on("open-url", listener);

  return () => {
    events.off?.("open-url", listener);
  };
}
