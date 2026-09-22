[Chinese](./CREATE_YOUR_APP.md) | English

---

# Create a new app from the Starter

This guide is the source of truth for execution order, timing, safety boundaries,
and verification when initializing the Starter as a downstream product. The
README's
[rebranding checklist](../README_EN.md#required-rebranding-before-the-first-release)
owns concrete defaults, file locations, secrets, permissions, and artifact
configuration; this guide links to those groups instead of duplicating them.

## Phase A: Before product development

### 1. Decide the repository relationship

First decide whether the new app will continue tracking the Starter:

- If you expect to merge upstream improvements, use your fork as `origin` and
  retain the Starter repository as `upstream`.
- If the product needs a fully independent repository, point `origin` at the new
  repository and explicitly decide whether to retain `upstream` for reference
  only.

Use `git remote -v` to confirm the push target. Do not destructively rewrite
history merely to remove the Starter name, and do not remove the upstream
license notice.

### 2. Establish an uncustomized baseline

From the repository root, install the locked toolchain and dependencies, then
run the local gates before rebranding:

```bash
mise run setup
mise run check:feature-docs
mise run check:lockfile
mise run typecheck
mise run lint
mise run test
```

Run `mise run dev` as well to confirm that the system-WebView edition starts. If
the baseline fails, record and resolve it first so upstream issues are not mixed
with downstream changes.

### 3. Isolate identity and state immediately

Complete these README checklist groups in order before product development:

1. [Brand and application identity](../README_EN.md#brand-and-application-identity): establish an independent app identity and brand assets first.
2. [Packages and local state](../README_EN.md#packages-and-local-state): isolate the package scope, data directory, app-owned environment variables, and browser persistence keys.
3. [Repository and release artifacts](../README_EN.md#repository-and-release-artifacts): replace repository, update-feed, and version ownership immediately; final artifact acceptance may wait until Phase B.
4. [License and downstream attribution](../README_EN.md#license-and-downstream-attribution): retain the upstream notice and add downstream attribution as needed.

Use `rg` to find every reference before changing scopes, prefixes, or public
URLs. Never write certificates, private keys, or real secrets into configuration,
example files, or Git history, and do not distribute builds until the update
feed is isolated.

### 4. Replace the placeholder shell

Start in `apps/desktop/src/app/page.tsx`. When native capabilities are needed,
keep using the typed RPC contract in `apps/desktop/src/shared/rpc.ts` and the
command layer in `apps/desktop/src/shared/commands.ts`; do not import Bun-only
implementations directly into the renderer.

Modules not yet connected in the feature catalog should remain disconnected
until the product has an explicit use case and defined authorization,
validation, and confirmation policies. Keep both feature catalogs synchronized
when connection status changes.

### 5. Check for leftovers and rerun the gates

After initial rebranding, search for Starter defaults:

```bash
rg -n 'shallinta|electrobun-app-starter|Electrobun App Starter|ElectrobunAppStarter|com\.shallinta|ELECTROBUN_APP_STARTER'
```

Classify each match as required upstream attribution or an unreplaced product
setting. Then rerun every gate from Phase A, step 2, plus `mise run dev`.

## Phase B: Before the first public release

### 1. Complete deferred release configuration

Complete these checklist groups before the first public release:

1. [Apple signing and notarization](../README_EN.md#apple-signing-and-notarization): use the downstream organization's own Team, certificate, notarization credentials, and repository secrets; never reuse the Starter maintainer's credentials.
2. [System capabilities](../README_EN.md#system-capabilities): declare only permissions the product actually needs and validate them in the signed app.
3. [Repository and release artifacts](../README_EN.md#repository-and-release-artifacts): recheck that the update feed, version, tag, artifact names, and release copy all belong to the new product.

### 2. Validate the release path in order

First install a full Xcode 26+ toolchain and select it with `xcode-select`.
Packaging the Icon Composer `.icon` requires its `actool`; Command Line Tools
alone are insufficient. Then rerun the local gates and validate unsigned
packaging and the release preflight:

```bash
mise run check:feature-docs
mise run check:lockfile
mise run typecheck
mise run lint
mise run test
mise run pack
mise run release -- --dry-run
```

Run `mise run pack:adhoc` afterward when a local signing-path rehearsal is
useful. After the real release, require the arm64 build, signing, notarization,
and launch checks in the release workflow to pass before accepting installation
and updates from GitHub Releases.
