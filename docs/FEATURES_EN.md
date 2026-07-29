[中文](./FEATURES.md) | English

---

# Feature catalog

This catalog separates capabilities connected to the default application shell from implementations that a downstream product must deliberately connect. Source code existing does not mean a capability is visible, registered with RPC or menus, packaged for release, or covered by product-level security decisions.

## Connected in the app shell

<!-- feature: lifecycle-environment -->

### Application lifecycle and environment loading

- **Capability:** Loads the login-shell environment before constructing process-scoped services, the window, RPC, updates, and shutdown cleanup.
- **Use cases:** A desktop app needs deterministic startup ordering and an awaitable shutdown path.
- **Shell status:** Connected in the default Bun process.
- **How to connect:** Construct new services in the composition root and inject dependencies explicitly; preserve environment hydration before the dynamic import and add resources that flush or dispose to `stop()`.
- **Code locations:** `apps/desktop/src/bun/index.ts`, `apps/desktop/src/bun/env/hydrate.ts`, `apps/desktop/src/bun/app/start-desktop-app.ts`

<!-- feature: window-state -->

### Native window and durable state

- **Capability:** Creates the native main window and serially persists its frame, maximized, full-screen, and zoom state.
- **Use cases:** Users expect their desktop layout to return after restarting the app.
- **Shell status:** Connected, including a shutdown flush for pending state writes.
- **How to connect:** Extend window configuration through `createMainWindow`; collect, validate, and persist new native state on the Bun side rather than reading state files from the renderer.
- **Code locations:** `apps/desktop/src/bun/app/window.ts`, `apps/desktop/src/bun/app/window-state.ts`, `packages/shared/src/server/window-state.ts`

<!-- feature: typed-rpc -->

### Typed RPC

- **Capability:** Connects the trusted Bun process and WebView renderer through one shared TypeScript contract.
- **Use cases:** Renderer UI needs to request native capabilities or receive main-process state changes.
- **Shell status:** Connected for updates, commands, full-screen state, and localization synchronization through `getLocale`, `setLocale`, and `localeChanged`.
- **How to connect:** Declare a request or message in the shared schema, then implement its Bun handler and renderer call site; validate sensitive inputs again at the Bun boundary.
- **Code locations:** `apps/desktop/src/shared/rpc.ts`, `apps/desktop/src/bun/rpc/index.ts`, `apps/desktop/src/lib/electrobun.ts`

<!-- feature: command-routing -->

### Cross-runtime command routing

- **Capability:** Represents menu, command-palette, and renderer actions as one `Command` union with target metadata.
- **Use cases:** The same action has multiple entry points or must cross the WebView/Bun boundary.
- **Shell status:** Connected for settings, sidebar, window, link, and update commands.
- **How to connect:** Register the command and its target in the shared union and `COMMAND_META`, implement it in the renderer registry or Bun executor, and add its display name to both `commands` catalogs; only the active UI owner should register a given renderer command at a time.
- **Code locations:** `apps/desktop/src/shared/commands.ts`, `apps/desktop/src/commands/index.tsx`, `apps/desktop/src/bun/commands.ts`

<!-- feature: native-menus -->

### Native menus and command palette

- **Capability:** Provides locale-rebuilt macOS application menus, keyboard shortcuts, and a searchable command palette routed through the command layer.
- **Use cases:** Users execute the same behavior from system menus, the keyboard, or in-app search.
- **Shell status:** Connected for settings, sidebar, zoom, reload, updates, and help links; File menu placeholders remain disabled.
- **How to connect:** Give each new menu item a stable action mapped to an existing command, and expose only context-free commands in the command palette.
- **Code locations:** `apps/desktop/src/bun/app/menu.ts`, `apps/desktop/src/components/command-palette.tsx`, `apps/desktop/src/shared/commands.ts`

<!-- feature: sidebar-shell -->

### Collapsible sidebar shell

- **Capability:** Provides a resizable, collapsible left navigation region with a persisted pixel width.
- **Use cases:** A downstream product needs navigation, a file tree, or a workspace list.
- **Shell status:** Connected to the layout, `View > Toggle Sidebar`, and `Command+B`; its content remains a placeholder.
- **How to connect:** Replace the placeholder inside the existing panel; keep the shared storage key and size validation, and do not overwrite the remembered width when collapsed to `0px`.
- **Code locations:** `apps/desktop/src/app/page.tsx`, `apps/desktop/src/lib/sidebar-size.ts`, `packages/ui/src/lib/local-storage.ts`

<!-- feature: theme-preferences -->

### Theme and primary-color preferences

- **Capability:** Supports light, dark, system, and custom accent preferences stored through an exception-safe localStorage wrapper.
- **Use cases:** Users want the desktop UI to follow system appearance or product branding.
- **Shell status:** Connected at the application root, pre-React anti-flash bootstrap, and Settings UI.
- **How to connect:** Consume `useTheme` and `usePrimaryColor`; give `LOCAL_STORAGE_KEYS` registry ownership of new persistent UI keys and synchronize mirror literals in the bootstrap script that cannot import it.
- **Code locations:** `packages/ui/src/components/theme-provider.tsx`, `packages/ui/src/lib/local-storage.ts`, `apps/desktop/src/mainview/index.html`

<!-- feature: settings-shell -->

### Settings shell

- **Capability:** Provides a lazy-loaded Settings dialog with General/About tabs, language, theme, accent, update mode, and version UI.
- **Use cases:** A downstream product needs one place for preferences and application information.
- **Shell status:** Connected to the native menu, command palette, and renderer command.
- **How to connect:** Add an independent page or section for new settings and place native reads and writes behind typed RPC; keep `SettingsTab` and menu routing synchronized when adding entry points.
- **Code locations:** `apps/desktop/src/components/settings/`, `apps/desktop/src/app/page.tsx`, `apps/desktop/src/shared/commands.ts`

<!-- feature: localization -->

### Bilingual localization

- **Capability:** Uses i18next to share the `common`, `settings`, `menu`, `commands`, and `updates` JSON namespaces for `en-US` and `zh-CN` between the Bun process and React renderer, switching the shell, native menus, and update messages without restarting.
- **Use cases:** A downstream product should follow the system language on first launch while letting users explicitly choose English or Simplified Chinese.
- **Shell status:** Connected to Settings, the main shell, command palette, update UI, and every native menu item; Bun is the single locale source of truth, maps Chinese system locales to `zh-CN` and all others to `en-US` on first launch, persists the result in the application data directory's `settings/locale.json`, and synchronizes the renderer through the typed `getLocale`, `setLocale`, and `localeChanged` RPC surface.
- **How to connect:** Add matching keys to the same namespace in both locale directories and consume them through React `useTranslation` or Bun `translate`; renderer initialization synchronizes document `lang`/`dir`, Bun rebuilds native menus, and the startup initialization failure screen uses a bilingual fallback; after brand or copy changes, run strict key typechecking and the locale parity tests.
- **Code locations:** `apps/desktop/src/shared/i18n/`, `apps/desktop/src/bun/i18n/`, `apps/desktop/src/lib/renderer-i18n.ts`, `apps/desktop/src/hooks/use-locale.ts`, `apps/desktop/src/mainview/main.tsx`, `apps/desktop/src/shared/rpc.ts`

<!-- feature: external-url-security -->

### External URL security boundary

- **Capability:** Opens links in the system browser and accepts only parseable HTTP(S) URLs at the Bun boundary.
- **Use cases:** Help menus open documentation, a homepage, or the repository without navigating the WebView to an untrusted scheme.
- **Shell status:** Connected through the Help menu's `openLink` commands.
- **How to connect:** Route every new external URL through `openLink` instead of calling native APIs from the renderer; define an explicit allowlist and threat model before permitting another protocol.
- **Code locations:** `apps/desktop/src/bun/parse-external-url.ts`, `apps/desktop/src/bun/commands.ts`, `apps/desktop/src/bun/app/menu.ts`

<!-- feature: fullscreen-runtime -->

### Full-screen and window runtime state

- **Capability:** Supplies an initial full-screen RPC query, deduplicated change messages, a maximize command, and a renderer subscription hook.
- **Use cases:** Custom title bars or immersive layouts need to follow native window state.
- **Shell status:** Runtime plumbing is connected and the system full-screen menu works, but `useFullScreen` is not mounted and the shell has no custom title bar or maximize button.
- **How to connect:** Mount `useFullScreen` in optional UI and execute `toggleMaximized` through the command layer; keep the system window as the source of truth instead of duplicating its state machine in React.
- **Code locations:** `apps/desktop/src/hooks/use-full-screen.ts`, `apps/desktop/src/lib/full-screen-store.ts`, `apps/desktop/src/bun/app/window-state.ts`

<!-- feature: updates -->

### Automatic updates and update UI

- **Capability:** Supports automatic, manual, and off modes across check, download, restart, and user-visible status flows.
- **Use cases:** A released macOS app retrieves new versions from a versioned feed.
- **Shell status:** Connected to the Bun service, RPC, menus, Settings, indicator, and update dialog; the development channel skips background checks.
- **How to connect:** Configure a product-owned HTTPS feed, signing, and notarization credentials during rebranding; preserve check deduplication, timer cleanup, apply recovery, and update-mode semantics.
- **Code locations:** `apps/desktop/src/bun/updates/`, `apps/desktop/src/components/update-status-provider.tsx`, `apps/desktop/electrobun.config.ts`

<!-- feature: cef-cdp-development -->

### CEF/CDP development diagnostics

- **Capability:** Temporarily selects CEF through an explicit development task and exposes a validated CDP port only on `127.0.0.1`.
- **Use cases:** Developers need Chromium DevTools Protocol diagnostics for the renderer.
- **Shell status:** Connected as project tooling through `mise run dev:cef`; it is not a product feature and is absent from normal `dev` and every canary/stable release.
- **How to connect:** Run the task only for local diagnostics and complete final verification with the system WebView; production build scripts force the system renderer and clear the CDP port.
- **Code locations:** `apps/desktop/src/config/renderer.ts`, `apps/desktop/electrobun.config.ts`, `apps/desktop/package.json`

<!-- feature: engineering-gates -->

### Engineering quality gates

- **Capability:** Locks the mise/Bun toolchain and runs tests, zero-warning lint, TypeScript, Vite build, and lockfile mirror checks.
- **Use cases:** Local and CI workflows catch cross-workspace regressions and build failures before merge.
- **Shell status:** Connected through root scripts, mise tasks, and GitHub Actions.
- **How to connect:** Add new human-facing workflows to both `package.json` and `mise.toml`, add focused tests for new capabilities, and run the full gate before committing.
- **Code locations:** `package.json`, `mise.toml`, `.github/workflows/ci.yml`

<!-- feature: release-pipeline -->

### Packaging and release pipeline

- **Capability:** Builds, signs, notarizes, and publishes arm64/x64 artifacts and update feeds through atomic stable or canary version commits and tags.
- **Use cases:** A downstream product needs reproducible, verifiable macOS delivery.
- **Shell status:** Connected through local packaging tasks, release preflight, and the GitHub release workflow.
- **How to connect:** Before the first release, replace bundle ID, icons, certificates, App Store Connect credentials, repository URLs, and feed branding; never bypass preflight or push a release tag independently.
- **Code locations:** `scripts/release.ts`, `.github/workflows/release.yml`, `apps/desktop/electrobun.config.ts`

## Disconnected or future options

<!-- feature: confirm-dialog-cancel -->

### Explicit ConfirmDialog cancellation

- **Capability:** Provides a reusable confirmation dialog whose Cancel button can delegate close ownership to its caller.
- **Use cases:** An irreversible action needs confirmation or cancellation must run recovery logic.
- **Shell status:** The component and cancellation policy are tested, but the default app has no consumer.
- **How to connect:** Mount it with controlled `open` state in a product feature; when `onCancel` exists the caller must close it, while Escape/outside dismissal still uses `onOpenChange`, and destructive work runs only after `onConfirm`.
- **Code locations:** `packages/ui/src/components/confirm-dialog.tsx`, `packages/ui/src/components/confirm-dialog.test.ts`

<!-- feature: native-files -->

### Native file operations

- **Capability:** Provides Bun-only file/directory pickers, open, reveal, and move-to-system-trash implementations.
- **Use cases:** A downstream product explicitly needs user-selected files or Finder actions on authorized paths.
- **Shell status:** Implementations and tests exist, but there is no RPC, command, menu, or renderer connection, so the default shell cannot invoke them.
- **How to connect:** Return picker results through typed RPC and expose open/reveal through Bun commands or requests; enforce absolute paths and a product allowlist, confirm trash operations, and never add arbitrary-path read/write RPC.
- **Code locations:** `apps/desktop/src/bun/native-files/index.ts`, `apps/desktop/src/bun/native-files/commands.ts`

<!-- feature: desktop-safe-link -->

### Desktop-safe Link

- **Capability:** The shared `Link` keeps real anchor semantics with an injected opener, while the desktop `ExternalLink` adapter routes clicks to the existing `openLink` security boundary.
- **Use cases:** About, help, Markdown, or documentation views need accessible and copyable external links.
- **Shell status:** The component and adapter exist, but `ExternalLink` currently has no renderer consumer.
- **How to connect:** Import `ExternalLink` in product UI under `CommandProvider`; keep URLs behind the Bun HTTP(S) allowlist and do not use a plain anchor to navigate the WebView.
- **Code locations:** `packages/ui/src/components/link.tsx`, `apps/desktop/src/components/external-link.tsx`, `apps/desktop/src/bun/parse-external-url.ts`

<!-- feature: custom-titlebar-window-state -->

### Custom-title-bar window state

- **Capability:** Uses the connected full-screen subscription and maximize command to support a product-owned title bar or window controls.
- **Use cases:** A product hides toolbar content in full screen or adds a custom maximize button.
- **Shell status:** Lower-level support is available, but the hook is not mounted and the default shell has no custom title-bar UI.
- **How to connect:** Subscribe with `useFullScreen` in the real title-bar component and execute `toggleMaximized` through `useCommands`; preserve usable native traffic-light regions, keyboard menus, and system state as the single source of truth.
- **Code locations:** `apps/desktop/src/hooks/use-full-screen.ts`, `apps/desktop/src/shared/commands.ts`, `apps/desktop/src/bun/app/window.ts`

<!-- feature: deep-link-template -->

### Deep-link template

- **Capability:** Provides strict scheme/host/path validation, a bounded cold-start queue, delayed handler injection, and removable event capture.
- **Use cases:** A downstream product opens a specific internal target from an application-owned URL scheme.
- **Shell status:** The template and tests exist, but the default config has no `urlSchemes`, the Bun entry does not import or register it, and there is no placeholder scheme.
- **How to connect:** Choose an application-owned scheme and add it to Electrobun config, register capture immediately after environment hydration, inject the validated handler from the composition root, then route visible effects through typed commands or RPC; constrain host/path, length, and queue capacity.
- **Code locations:** `apps/desktop/src/bun/deep-link/index.ts`, `apps/desktop/electrobun.config.ts`, `apps/desktop/src/bun/index.ts`
