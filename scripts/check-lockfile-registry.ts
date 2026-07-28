const LOCKFILE_PATH = process.argv[2] ?? "bun.lock";
const FORBIDDEN_REGISTRY = "registry.npmmirror.com";
const LOCKFILE = Bun.file(LOCKFILE_PATH);

if (!(await LOCKFILE.exists())) {
  console.error(`✖ lockfile not found: ${LOCKFILE_PATH}`);
  process.exit(1);
}

const CONTENTS = await LOCKFILE.text();
const MATCH_COUNT = CONTENTS.split(FORBIDDEN_REGISTRY).length - 1;

if (MATCH_COUNT > 0) {
  console.error(
    `✖ ${LOCKFILE_PATH} contains ${MATCH_COUNT} reference(s) to ${FORBIDDEN_REGISTRY}`
  );
  process.exit(1);
}

console.info(`✔ ${LOCKFILE_PATH} uses no forbidden package registry URLs`);
