import type { ElectrobunConfig } from "electrobun";

import { resolveMacRendererConfig } from "./src/config/renderer";

import packageJson from "./package.json";

// Local-testing escape hatches — CI leaves all of these unset:
//   ELECTROBUN_APP_STARTER_SKIP_SIGNING=1  → unsigned canary/stable build
//   ELECTROBUN_APP_STARTER_SKIP_NOTARIZE=1 → sign but skip notarization
//   ELECTROBUN_APP_STARTER_UPDATE_BASE_URL → use a local update feed
const skipSigning = Boolean(Bun.env.ELECTROBUN_APP_STARTER_SKIP_SIGNING);
const skipNotarize =
  skipSigning || Boolean(Bun.env.ELECTROBUN_APP_STARTER_SKIP_NOTARIZE);

const RELEASE_DOWNLOADS =
  "https://github.com/shallinta/electrobun-app-starter/releases/download";
const updateBaseUrl =
  Bun.env.ELECTROBUN_APP_STARTER_UPDATE_BASE_URL ??
  `${RELEASE_DOWNLOADS}/updates`;
const macRendererConfig = resolveMacRendererConfig({
  renderer: Bun.env.ELECTROBUN_APP_STARTER_DESKTOP_RENDERER,
  cdpPort: Bun.env.ELECTROBUN_APP_STARTER_CDP_PORT,
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
      icons: "icon.iconset",
    },
    linux: {
      bundleCEF: false,
    },
    win: {
      bundleCEF: false,
    },
  },
  scripts: {
    // Both run right before their respective codesign step. Workaround for
    // electrobun#485 (x64-only, no-op elsewhere); see the script header.
    postBuild: "scripts/fix-x64-headerpad.ts",
    postWrap: "scripts/fix-x64-headerpad.ts",
  },
  release: {
    // Burned into every shipped bundle — the updater fetches
    // `{baseUrl}/{channel}-{os}-{arch}-update.json` from here.
    baseUrl: updateBaseUrl,
  },
} satisfies ElectrobunConfig;
