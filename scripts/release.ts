/**
 * Cut a release: preflight checks → commit-and-tag-version (bump the version in
 * apps/desktop/package.json, commit, tag) → push. The tag push triggers the
 * release workflow; the `-canary` suffix selects the channel.
 *
 * Usage:
 *   mise run release                          # stable (graduates a prerelease)
 *   mise run release:canary                   # next canary prerelease
 *   mise run release -- --release-as 0.2.0    # force an exact version
 *   mise run release -- --dry-run             # preview without touching anything
 */
import { $ } from "bun";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const branch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim();
if (branch !== "main") fail(`releases are cut from main (current: ${branch})`);

const dirty = (await $`git status --porcelain`.text()).trim();
if (dirty) fail("working tree is dirty — commit or stash first");

const remoteHeadsResult = Bun.spawnSync(
  ["git", "ls-remote", "--heads", "origin"],
  {
    stdout: "pipe",
    stderr: "pipe",
  }
);
if (remoteHeadsResult.exitCode !== 0) {
  const detail = remoteHeadsResult.stderr.toString().trim();
  fail(`cannot inspect origin${detail ? `: ${detail}` : ""}`);
}

const remoteHeads = remoteHeadsResult.stdout
  .toString()
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => line.split(/\s+/, 2));

if (remoteHeads.length === 0) {
  console.info("ℹ origin is empty — allowing the initial scaffold release");
} else {
  const remoteMain = remoteHeads.find(
    ([, ref]) => ref === "refs/heads/main"
  )?.[0];
  if (!remoteMain) {
    fail("origin has branches but no refs/heads/main");
  }

  await $`git fetch origin main --tags`;
  const local = (await $`git rev-parse HEAD`.text()).trim();

  if (isDryRun) {
    const ancestorResult = Bun.spawnSync(
      ["git", "merge-base", "--is-ancestor", remoteMain, local],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );
    if (ancestorResult.exitCode !== 0) {
      fail("local main does not contain origin/main — pull or rebase first");
    }
  } else if (local !== remoteMain) {
    fail("main is not in sync with origin/main — pull first");
  }
}

await $`bunx commit-and-tag-version ${args}`;

if (isDryRun) process.exit(0);

// --atomic: all-or-nothing — if main is rejected (e.g. someone pushed in the
// meantime), the tag must not land alone and trigger a release off an orphan.
await $`git push --atomic --follow-tags origin main`;

const { version } = (await Bun.file("apps/desktop/package.json").json()) as {
  version: string;
};
console.info(
  `\n✔ v${version} pushed — release CI: https://github.com/shallinta/electrobun-app-starter/actions`
);
