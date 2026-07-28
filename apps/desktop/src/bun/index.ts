import "./env/hydrate";

const { startDesktopApp } = await import("./app");
await startDesktopApp();
