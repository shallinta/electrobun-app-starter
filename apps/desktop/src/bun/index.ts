import "./env/hydrate";

// GUI launches need login-shell hydration before the composition root is
// evaluated. Keep this import dynamic: a static import may evaluate the app
// before hydration has populated the process environment.
const { startDesktopApp } = await import("./app");
await startDesktopApp();
