[中文](./README.md) | English

---

# Electrobun App Starter

A production-shaped starter for building a native macOS desktop app with
[Electrobun](https://electrobun.dev), React, TypeScript, Bun, Tailwind CSS, and
shadcn/ui.

The repository provides the reusable application shell so you can start with
your product instead of rebuilding desktop plumbing. It intentionally contains
no product-specific domain logic, hosted web app, telemetry, proxy settings, or
embedded Chromium edition.

<!-- i18n: included -->

## Included

- An Electrobun main process and a Vite-powered React renderer.
- A typed RPC boundary and command routing between the two runtime contexts.
- Native window and menu management, persisted window state, and safe external
  link handling.
- Theme, primary-color, update, and about settings.
- Automatic-update infrastructure and macOS release workflows for Apple
  Silicon and Intel.
- A shared UI package with Tailwind CSS and shadcn/ui primitives.
- Bun tests, TypeScript checks, ESLint, Prettier, Husky, and GitHub Actions.

<!-- i18n: requirements -->

## Requirements

- macOS
- [mise](https://mise.jdx.dev) (recommended)
- [Bun](https://bun.com) if you do not use mise

<!-- i18n: getting-started -->

## Get started

Clone the repository, then install the locked toolchain and dependencies:

```bash
mise run setup
```

Start the desktop app with Vite HMR:

```bash
mise run dev
```

Changes to the React renderer are updated through HMR. Restart the command after
changing Bun main-process code.

<!-- i18n: common-commands -->

## Common commands

| Task                            | Command                 |
| ------------------------------- | ----------------------- |
| List available tasks            | `mise tasks ls`         |
| Install dependencies            | `bun install`           |
| Run the desktop app             | `mise run dev`          |
| Run tests                       | `mise run test`         |
| Run lint                        | `mise run lint`         |
| Run type checks                 | `mise run typecheck`    |
| Build a canary package          | `mise run build:canary` |
| Build a stable package          | `mise run build:stable` |
| Run an unsigned packaging check | `mise run pack`         |

Use Bun for packages and scripts. Do not use npm, pnpm, or Yarn in this
repository.

<!-- i18n: project-layout -->

## Project layout and runtime boundaries

```text
apps/
  desktop/        Electrobun app: Bun main process and React renderer
packages/
  shared/         Framework-neutral filesystem and window-state utilities
  ui/             Shared React components, design tokens, and UI primitives
scripts/
  release.ts      Version, tag, and release-push workflow
```

The Bun process owns native capabilities. The renderer requests those
capabilities through the typed RPC contract in
`apps/desktop/src/shared/rpc.ts`; it must not import Bun-only modules.
Cross-boundary user actions use the command definitions in
`apps/desktop/src/shared/commands.ts`.

<!-- i18n: customize -->

## Customize the starter

The main product surface is
`apps/desktop/src/app/page.tsx`. Replace its placeholders with your own
application UI and add capabilities behind the existing RPC and command
boundaries.

### Required rebranding before the first release

Complete every applicable item below before publishing a downstream app under a
new brand. The current values are starter defaults, not production values for
your product.

<!-- i18n: rebrand.brand-identity -->

#### Brand and application identity

- [ ] Replace every PNG in `apps/desktop/icon.iconset`. Keep the existing
      macOS iconset filenames and dimensions, and confirm
      `build.mac.icons: "icon.iconset"` in
      `apps/desktop/electrobun.config.ts` still points to it.
- [ ] Change the application name in
      `apps/desktop/electrobun.config.ts` (`app.name`, currently
      `Electrobun App Starter`) and all user-visible copies in
      `apps/desktop/src/mainview/index.html`, `apps/desktop/src/app/page.tsx`,
      `apps/desktop/src/components/settings/settings-dialog.tsx`,
      `apps/desktop/src/bun/app/window.ts`, and
      `apps/desktop/src/bun/app/menu.ts`.
- [ ] Assign a bundle identifier owned by your organization in
      `apps/desktop/electrobun.config.ts` (`app.identifier`, currently
      `com.shallinta.electrobun-app-starter`). Treat it as permanent after release
      because installed applications and updater state are identified by it.

<!-- i18n: rebrand.packages-local-state -->

#### Packages and local state

- [ ] Rename the root workspace package (`name` in `package.json`) and the
      `@shallinta/desktop`, `@shallinta/shared`, and `@shallinta/ui` packages in
      their respective `package.json` files. If you change the `@shallinta` scope,
      update all imports and dependencies under `apps/` and `packages/`, then run
      `bun install` so `bun.lock` matches the renamed workspace packages.
- [ ] Give the product its own data directory and override variable in
      `packages/shared/src/server/paths.ts` (currently
      `~/.electrobun-app-starter` and `ELECTROBUN_APP_STARTER_HOME`). Update the
      matching tests, `.gitignore`, the `.electrobun-app-starter/**` ignore in
      `eslint.config.js`, and the path references in `AGENTS.md` and the READMEs.
- [ ] Rename the application-owned `ELECTROBUN_APP_STARTER_*` environment
      prefix everywhere, including `apps/desktop/electrobun.config.ts`,
      `apps/desktop/src/bun/env/hydrate.ts`,
      `apps/desktop/scripts/serve-feed.ts`, `packages/shared/src/server/paths.ts`,
      `mise.toml`, and tests. Do not rename Electrobun's own
      `ELECTROBUN_DEVELOPER_ID` or `ELECTROBUN_APPLEAPI*` variables unless the
      Electrobun interface itself changes.
- [ ] Namespace browser persistence for the new product. Replace
      `electrobun-app-starter-theme` and
      `electrobun-app-starter-primary` together in
      `packages/ui/src/components/theme-provider.tsx` and the pre-React bootstrap
      in `apps/desktop/src/mainview/index.html`.

<!-- i18n: rebrand.repository-artifacts -->

#### Repository and release artifacts

- [ ] Choose the public artifact prefix and DMG filename. Electrobun derives its
      intermediate artifact names from `app.name`; the versioned release renames
      installers with `rename_dmgs artifacts/regular ElectrobunAppStarter` in
      `.github/workflows/release.yml`. Replace that prefix, the example filenames,
      and the release install text in the same workflow.
- [ ] Replace the GitHub owner/repository and product links. The fixed URLs are
      in `apps/desktop/electrobun.config.ts` (`RELEASE_DOWNLOADS` and the `updates`
      feed), `apps/desktop/src/bun/app/menu.ts` (`DOCS_URL`, `HOMEPAGE_URL`, and
      `REPOSITORY_URL`), `apps/desktop/src/components/update-status-provider.tsx`
      (`RELEASE_TAG_URL`), and `scripts/release.ts` (the release Actions URL).
      Also update this README's product links as needed. The release workflow uses
      GitHub's `GITHUB_REPOSITORY` for repository-relative release and changelog
      links, so verify it runs in the new repository.
- [ ] Set the intended first version in `apps/desktop/package.json` and add its
      matching `## [x.y.z]` section to `CHANGELOG.md`. `.versionrc.json` and
      `scripts/release.ts` bump that package, and `.github/workflows/release.yml`
      requires tag `v{x.y.z}` to match it and uses the matching changelog section
      as release notes.

<!-- i18n: rebrand.apple-release -->

#### Apple signing and notarization

- [ ] Provision a **Developer ID Application** certificate for your own Apple
      Developer team and verify its Team ID. Export that certificate **with its
      private key** as a password-protected `.p12`, base64-encode it into the
      `MACOS_CERTIFICATE_P12` GitHub Actions secret, and store its password in
      `MACOS_CERTIFICATE_PWD`. `.github/workflows/release.yml` imports the `.p12`,
      extracts its signing identity, and exports `ELECTROBUN_DEVELOPER_ID`; there
      is no separate Team ID setting in the current workflow.
- [ ] Create App Store Connect notarization credentials for the same
      organization and configure the GitHub Actions secrets consumed by
      `.github/workflows/release.yml`: `ASC_API_KEY_P8`, `ASC_API_KEY_ID`, and
      `ASC_API_ISSUER_ID`. Run a signed build and confirm the workflow's
      `codesign`, `spctl`, and `stapler` checks pass.

Never reuse the starter maintainer's certificate, Team ID, private key, App
Store Connect key, or GitHub secrets. This repository does not include signing
private keys; each downstream publisher must provision and protect its own.

<!-- i18n: rebrand.system-capabilities -->

#### System capabilities

- [ ] If the downstream app uses protected macOS resources or additional
      capabilities, add the required entries under `build.mac.entitlements` in
      `apps/desktop/electrobun.config.ts`. For entitlements that Electrobun maps
      to an `NS*UsageDescription` key, use the exact user-facing purpose string as
      the entitlement value, then validate both the entitlements and generated
      `Info.plist` in the signed app. This starter adds no product-specific
      permissions, so select them for the downstream product rather than copying
      them by assumption.

<!-- i18n: rebrand.license-attribution -->

#### License and downstream attribution

- [ ] Keep the upstream copyright notice in `LICENSE` when adding downstream
      attribution.

After replacing the defaults, search for leftovers before the first release:

```bash
rg -n 'shallinta|electrobun-app-starter|Electrobun App Starter|ElectrobunAppStarter|com\.shallinta|ELECTROBUN_APP_STARTER'
```

<!-- i18n: releases -->

## Releases

The app version is stored in `apps/desktop/package.json`. The release commands
run preflight checks, create the version commit and tag, then push atomically:

```bash
mise run release
mise run release:canary
```

Use `mise run release -- --dry-run` to preview a release. See
[AGENTS.md](./AGENTS.md) for architecture, release, and contribution
conventions.

<!-- i18n: license -->

## License

Electrobun App Starter is released under the [MIT License](./LICENSE).
