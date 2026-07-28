interface MacRendererConfigInput {
  renderer?: string;
  cdpPort?: string;
}

interface MacRendererConfig {
  bundleCEF: boolean;
  defaultRenderer?: "cef";
  chromiumFlags?: Record<string, string | boolean>;
}

export function resolveMacRendererConfig({
  renderer,
  cdpPort,
}: MacRendererConfigInput): MacRendererConfig {
  if (renderer !== "cef") {
    return {
      bundleCEF: false,
    };
  }

  if (cdpPort === undefined || cdpPort === "") {
    return {
      bundleCEF: true,
      defaultRenderer: "cef",
    };
  }

  if (!/^\d+$/.test(cdpPort)) {
    throw new Error("Invalid CDP port.");
  }

  const port = Number(cdpPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Invalid CDP port.");
  }

  return {
    bundleCEF: true,
    defaultRenderer: "cef",
    chromiumFlags: {
      "remote-debugging-address": "127.0.0.1",
      "remote-debugging-port": cdpPort,
    },
  };
}
