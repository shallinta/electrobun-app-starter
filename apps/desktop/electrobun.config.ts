import type { ElectrobunConfig } from "electrobun";

import { resolveMacRendererConfig } from "./src/config/renderer";

import packageJson from "./package.json";

// Local-testing escape hatches — CI leaves all of these unset:
//   ELECTROBUN_APP_STARTER_SKIP_SIGNING=1  → unsigned canary/stable build
//   ELECTROBUN_APP_STARTER_SKIP_NOTARIZE=1 → sign but skip notarization
//   ELECTROBUN_APP_STARTER_UPDATE_BASE_URL → use a local update feed
const skipSigning = Boolean(process.env.ELECTROBUN_APP_STARTER_SKIP_SIGNING);
const skipNotarize =
  skipSigning || Boolean(process.env.ELECTROBUN_APP_STARTER_SKIP_NOTARIZE);

const RELEASE_DOWNLOADS =
  "https://github.com/shallinta/electrobun-app-starter/releases/download";
const updateBaseUrl =
  process.env.ELECTROBUN_APP_STARTER_UPDATE_BASE_URL ??
  `${RELEASE_DOWNLOADS}/updates`;
const macRendererConfig = resolveMacRendererConfig({
  renderer: process.env.ELECTROBUN_APP_STARTER_DESKTOP_RENDERER,
  cdpPort: process.env.ELECTROBUN_APP_STARTER_CDP_PORT,
});

export default {
  app: {
    name: "Electrobun App Starter",
    identifier: "com.shallinta.electrobun-app-starter",
    // Single source of truth for the app version; release tags must match
    // (CI validates `v{version}` against the pushed tag).
    version: packageJson.version,
  },
  build: {
    // Preserve the Bun main process while adopting Electrobun 2's Hutch build
    // orchestration. Migrating to Cottontail is a separate product decision.
    mainProcess: "bun",
    bun: { entrypoint: "src/bun/index.ts" },
    // Vite builds to dist/; imported assets are copied with their hashes.
    copy: {
      "dist/index.html": "views/mainview/index.html",
      "dist/assets": "views/mainview/assets",
    },
    // Ignore Vite output in watch mode — HMR handles view rebuilds separately.
    watchIgnore: ["dist/**"],
    mac: {
      // Signing/notarization run only on canary/stable builds and require the
      // ELECTROBUN_DEVELOPER_ID + App Store Connect API key env vars (CI).
      codesign: !skipSigning,
      notarize: !skipNotarize,
      ...macRendererConfig,
      icons: "AppIcon.icon",
    },
    linux: {
      bundleCEF: false,
    },
    win: {
      bundleCEF: false,
    },
  },
  scripts: {
    // Electrobun appends "-dev" to CFBundleName; keep the development display
    // name aligned with app.name without changing the generated bundle path.
    postPackage: "scripts/fix-dev-display-name.ts",
  },
  release: {
    // Burned into every shipped bundle — the updater fetches
    // `{baseUrl}/{channel}-{os}-{arch}-update.json` from here.
    baseUrl: updateBaseUrl,
  },
} satisfies ElectrobunConfig;
