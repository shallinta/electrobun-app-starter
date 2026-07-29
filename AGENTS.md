## Introduction

Electrobun App Starter is a reusable native macOS desktop application shell. It
provides the application lifecycle, typed RPC, command routing, settings,
updates, shared UI, build tooling, and release automation. Product-specific
behavior belongs in downstream applications, not in the starter by default.

The app uses the system WebView renderer. The scaffold does not include a web
site, embedded Chromium edition, analytics, proxy management, or domain-specific
backend.

## Tooling

`mise` is the task front door: `mise tasks ls` lists every supported workflow.
Task bodies normally forward to scripts in `package.json`. Bun is both the
package manager and JavaScript runtime. Its compatible version is declared in
`mise.toml`, while the exact toolchain is locked in `mise.lock`.

Do not use npm, pnpm, or Yarn.

| Task                 | Command                       | Notes                                                 |
| -------------------- | ----------------------------- | ----------------------------------------------------- |
| Set up a fresh clone | `mise run setup`              | Installs the locked tools and JavaScript dependencies |
| Install dependencies | `bun install`                 | Run from the repository root                          |
| Run the desktop app  | `mise run dev`                | Vite HMR on port 5173 plus Electrobun                 |
| Diagnose with CEF    | `mise run dev:cef`            | Local CEF + loopback CDP; never used for releases     |
| Test                 | `mise run test`               | Runs the complete Bun test suite                      |
| Check feature docs   | `mise run check:feature-docs` | Verifies bilingual catalog IDs, order, and fields     |
| Lint                 | `mise run lint`               | Read-only ESLint check                                |
| Fix lint             | `mise run lint:fix`           | Runs ESLint with autofix                              |
| Typecheck            | `mise run typecheck`          | Checks the root, shared UI, and desktop projects      |
| Build canary         | `mise run build:canary`       | Builds the renderer and Electrobun canary package     |
| Build stable         | `mise run build:stable`       | Builds the renderer and Electrobun stable package     |
| Package locally      | `mise run pack`               | Unsigned canary packaging check                       |
| Cut a release        | `mise run release`            | Bumps, tags, and pushes a stable release              |
| Cut a canary         | `mise run release:canary`     | Bumps, tags, and pushes a prerelease                  |

Changes to the renderer update through HMR. Restart `mise run dev` after changing
Bun main-process code.

## Repository layout

This is a Bun workspace monorepo:

- `apps/desktop` — the Electrobun application.
  - `src/bun` is the trusted Bun main process. It owns native windows, menus,
    filesystem paths, updates, and the Bun side of RPC.
  - `src/mainview` is the Vite entry for the renderer.
  - `src/app` and `src/components` contain the React application shell.
  - `src/shared` contains contracts used by both runtime contexts.
- `packages/shared` — framework-neutral shared utilities. Its `./server`
  entrypoint is Bun-only and contains application paths and window-state
  persistence.
- `packages/ui` — shared React components, shadcn/ui primitives, design tokens,
  and theme support. It has no build step and is consumed as TypeScript.
- `scripts` — repository automation, including the release command.

Workspace packages use the `@shallinta` scope.

## Runtime boundaries

The Bun main process and WebView renderer communicate through one typed RPC
contract in `apps/desktop/src/shared/rpc.ts`. Bun handlers are assembled in
`apps/desktop/src/bun/rpc/index.ts`; the renderer client lives in
`apps/desktop/src/lib/electrobun.ts`.

The renderer must not import Bun-only or native implementations. Add a typed RPC
request or message when renderer code needs a native capability.

Every cross-boundary user action is a `Command` defined in
`apps/desktop/src/shared/commands.ts`. `COMMAND_META` assigns each command to the
WebView or Bun target. Native menus and renderer controls must route these
actions through the command layer instead of calling cross-boundary handlers
directly.

The production composition root is
`apps/desktop/src/bun/app/start-desktop-app.ts`. Construct process-scoped
services there and pass dependencies explicitly into RPC, commands, and
lifecycle code. Avoid import-time manager instances and service locators.

Modules that require a downstream product decision stay disconnected by
default. In particular, native files, desktop-safe links, and deep links must
not gain import-time registration, RPC handlers, commands, menus, renderer
consumers, schemes, or packaging changes merely because their reusable source
exists. Connect them only with an explicit use case and the required validation,
authorization, and confirmation policy.

## Persistence

Application data defaults to `~/.electrobun-app-starter`. Override the root with
`ELECTROBUN_APP_STARTER_HOME` for isolated development and tests. Do not write
routine runtime data into the repository.

Window state is persisted below the application data directory. Keep filesystem
ownership in the Bun process; the renderer must access native state through RPC.

## Releases and updates

`apps/desktop/package.json` is the source of truth for the app version.
`apps/desktop/electrobun.config.ts` owns application metadata, bundle identity,
artifacts, signing behavior, and the update feed.

The release script supports these remote states:

- An empty `origin` is allowed for the initial scaffold dry-run and release.
- When `refs/heads/main` exists, dry-run permits local `main` to be ahead, but it
  must contain the remote commit.
- A real release requires local `HEAD` to match remote `main` exactly.
- A non-empty remote without `main`, or a failed remote query, fails closed.

`mise run release` and `mise run release:canary` use
`commit-and-tag-version`, then atomically push `main` and its tags. Release
workflows build macOS arm64 and x64 artifacts. Never bypass release preflight
checks or push a release tag independently.

For local packaging, these environment variables are supported:

- `ELECTROBUN_APP_STARTER_SKIP_SIGNING=1`
- `ELECTROBUN_APP_STARTER_SKIP_NOTARIZE=1`
- `ELECTROBUN_APP_STARTER_UPDATE_BASE_URL=<url>`
- `ELECTROBUN_APP_STARTER_HOME=<path>`

When changing the toolchain, update `mise.toml` and regenerate `mise.lock`.

## Static assets

Imported assets such as `import logo from "./logo.svg"` are hashed by Vite and
included with the renderer output.

Public assets referenced by absolute paths belong under
`apps/desktop/src/mainview/public`. A packaged build only includes public
directories explicitly copied by `apps/desktop/electrobun.config.ts`, so update
its `build.copy` map when adding a new top-level public directory.

`packages/ui/src/lib/local-storage.ts` owns the registry of browser persistence
keys. The synchronous pre-React appearance bootstrap in
`apps/desktop/src/mainview/index.html` cannot import that registry; when theme or
primary-color keys change, update its explicitly documented mirror literals in
the same change.

The application icon lives in `apps/desktop/icon.iconset`.

## Localization

The app shell supports only `en-US` and `zh-CN`. User-visible renderer copy
belongs in the JSON namespaces under
`apps/desktop/src/shared/i18n/resources/{en-US,zh-CN}`; keep namespace names and
keys synchronized between both locales. Bun-native menu and dialog copy must use
the plain i18next runtime in `apps/desktop/src/bun/i18n`.

The Bun process is the locale source of truth. On first launch it maps Chinese
system-locale variants to `zh-CN` and every other locale to `en-US`, then
persists the selection in the app data directory at `settings/locale.json`.
Renderer code must use the typed `getLocale`, `setLocale`, and `localeChanged`
RPC surface rather than creating another persistent locale store. Locale
changes must keep the React runtime, document `lang`/`dir`, and rebuilt native
menus synchronized. Keep the bilingual startup-failure fallback independent of
successful renderer i18n initialization.

Do not translate command discriminants, RPC names, log fields, or persisted enum
values. Command display labels belong in the `commands` catalog rather than
`COMMAND_META`. Run the locale parity tests in
`apps/desktop/src/shared/i18n/index.test.ts` and the normal typecheck whenever
catalogs or locale wiring change.

## Conventions

- TypeScript is strict, targets ESNext, and uses bundler module resolution.
- Every `.ts` and `.tsx` filename is kebab-case.
- React components, classes, types, and interfaces are PascalCase.
- Functions, variables, hooks, and command discriminants are camelCase.
- Module-level constants are UPPER_SNAKE_CASE.
- Prefix module-private functions and private class members with `_`.
- Use one primary component or export per file.
- Internal files in `packages/ui` generally prefer relative imports.
  shadcn-generated components may use the configured `#lib/*` and `#ui/*`
  package imports. The desktop `@/*` alias belongs to `apps/desktop` and must
  not leak into shared packages.
- Do not hand-edit generated files under `packages/ui/src/ui`. Add shadcn/ui
  components from `packages/ui` with
  `bunx --bun shadcn@latest add <component>`.
- Prefer app-level component wrappers over raw primitives.
- Route destructive or irreversible actions through a confirmation dialog.
- Menu and command labels use Title Case. Ordinary buttons, headings, helper
  text, and dialogs use sentence case.
- Keep `docs/FEATURES.md` and `docs/FEATURES_EN.md` structurally synchronized:
  preserve the same `<!-- feature: id -->` markers and order, and update all five
  localized fields in both files. Run `mise run check:feature-docs` after edits.

Prettier uses two-space indentation, double quotes, semicolons, ES5 trailing
commas, and Tailwind class sorting. Import ordering is enforced by ESLint.

## Performance

Consider render cost on changes to streaming views or frequently updated lists.
Use `memo()` only where the render path benefits, stabilize props with
`useMemo`/`useCallback`, and subscribe to the narrowest practical state slices.

## Verification

Before claiming a change is complete, run checks appropriate to its scope. The
full local gate is:

```bash
mise run check:feature-docs
mise run typecheck
mise run lint
mise run test
```

For release or packaging changes, also run the unsigned canary and stable builds
and validate the workflow YAML. Treat warnings as warnings, not successful
verification.
