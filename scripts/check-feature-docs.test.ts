import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

import { verifyFeatureDocs } from "./check-feature-docs";

const CHINESE_CATALOG_URL = new URL("../docs/FEATURES.md", import.meta.url);
const ENGLISH_CATALOG_URL = new URL("../docs/FEATURES_EN.md", import.meta.url);
const CHECKER_PATH = fileURLToPath(
  new URL("./check-feature-docs.ts", import.meta.url)
);

const CHINESE_ENTRY = `<!-- feature: typed-rpc -->
### 类型化 RPC

- **功能：** 在 Bun 与渲染进程之间共享类型安全契约。
- **使用场景：** 渲染进程需要调用可信的原生能力。
- **外壳状态：** 已接入。
- **接入方式：** 在共享契约中声明，再分别实现和调用。
- **代码位置：** \`apps/desktop/src/shared/rpc.ts\`
`;

const ENGLISH_ENTRY = `<!-- feature: typed-rpc -->
### Typed RPC

- **Capability:** Shares a type-safe contract between Bun and the renderer.
- **Use cases:** A renderer feature needs a trusted native capability.
- **Shell status:** Connected.
- **How to connect:** Declare the contract, then implement and call it.
- **Code locations:** \`apps/desktop/src/shared/rpc.ts\`
`;

describe("verifyFeatureDocs", () => {
  test("accepts matching ordered entries with every required label", () => {
    expect(() => verifyFeatureDocs(CHINESE_ENTRY, ENGLISH_ENTRY)).not.toThrow();
  });

  test("accepts the repository feature catalogs", async () => {
    const [chinese, english] = await Promise.all([
      Bun.file(CHINESE_CATALOG_URL).text(),
      Bun.file(ENGLISH_CATALOG_URL).text(),
    ]);

    expect(() => verifyFeatureDocs(chinese, english)).not.toThrow();
  });

  test("rejects empty feature catalogs", () => {
    expect(() => verifyFeatureDocs("", "")).toThrow(
      "Chinese feature catalog has no feature entries"
    );
  });

  test("rejects mismatched feature order", () => {
    const secondChineseEntry = CHINESE_ENTRY.replaceAll(
      "typed-rpc",
      "command-routing"
    );
    const secondEnglishEntry = ENGLISH_ENTRY.replaceAll(
      "typed-rpc",
      "command-routing"
    );

    expect(() =>
      verifyFeatureDocs(
        `${CHINESE_ENTRY}\n${secondChineseEntry}`,
        `${secondEnglishEntry}\n${ENGLISH_ENTRY}`
      )
    ).toThrow("Feature IDs or order differ");
  });

  test("rejects duplicate feature IDs", () => {
    expect(() =>
      verifyFeatureDocs(
        `${CHINESE_ENTRY}\n${CHINESE_ENTRY}`,
        `${ENGLISH_ENTRY}\n${ENGLISH_ENTRY}`
      )
    ).toThrow('Chinese feature catalog repeats feature ID "typed-rpc"');
  });

  test.each(["<!-- feature: extra_item -->", "<!-- feature extra-item -->"])(
    "rejects malformed feature marker %s",
    (marker) => {
      expect(() =>
        verifyFeatureDocs(`${CHINESE_ENTRY}\n${marker}`, ENGLISH_ENTRY)
      ).toThrow("Chinese feature catalog contains an invalid feature marker");
    }
  );

  test("rejects an entry missing a required localized label", () => {
    expect(() =>
      verifyFeatureDocs(
        CHINESE_ENTRY.replace("- **接入方式：**", "- **采用方式：**"),
        ENGLISH_ENTRY
      )
    ).toThrow(
      'Chinese feature "typed-rpc" is missing required label "接入方式："'
    );
  });

  test.each([
    [
      "Chinese",
      CHINESE_ENTRY.replace(
        "- **功能：** 在 Bun 与渲染进程之间共享类型安全契约。\n- **使用场景：** 渲染进程需要调用可信的原生能力。",
        "- **功能：** 在 Bun 与渲染进程之间共享类型安全契约。使用场景：渲染进程需要调用可信的原生能力。"
      ),
      ENGLISH_ENTRY,
      "使用场景：",
    ],
    [
      "English",
      CHINESE_ENTRY,
      ENGLISH_ENTRY.replace(
        "- **Capability:** Shares a type-safe contract between Bun and the renderer.\n- **Use cases:** A renderer feature needs a trusted native capability.",
        "- **Capability:** Shares a type-safe contract between Bun and the renderer. Use cases: A renderer feature needs a trusted native capability."
      ),
      "Use cases:",
    ],
  ])(
    "rejects a label mentioned only inside another field in the %s catalog",
    (catalogName, chinese, english, label) => {
      expect(() => verifyFeatureDocs(chinese, english)).toThrow(
        `${catalogName} feature "typed-rpc" is missing required label "${label}"`
      );
    }
  );

  test.each([
    [
      "Chinese",
      CHINESE_ENTRY.replace(
        "- **使用场景：** 渲染进程需要调用可信的原生能力。",
        "- **使用场景：** 渲染进程需要调用可信的原生能力。\n- **使用场景：** 重复字段。"
      ),
      ENGLISH_ENTRY,
      "使用场景：",
    ],
    [
      "English",
      CHINESE_ENTRY,
      ENGLISH_ENTRY.replace(
        "- **Use cases:** A renderer feature needs a trusted native capability.",
        "- **Use cases:** A renderer feature needs a trusted native capability.\n- **Use cases:** Duplicate field."
      ),
      "Use cases:",
    ],
  ])(
    "rejects a duplicate field in the %s catalog",
    (catalogName, chinese, english, label) => {
      expect(() => verifyFeatureDocs(chinese, english)).toThrow(
        `${catalogName} feature "typed-rpc" must contain required label "${label}" exactly once`
      );
    }
  );

  test.each([
    [
      "Chinese",
      CHINESE_ENTRY.replace(
        "- **功能：** 在 Bun 与渲染进程之间共享类型安全契约。",
        "- **功能：**   "
      ),
      ENGLISH_ENTRY,
      "功能：",
    ],
    [
      "English",
      CHINESE_ENTRY,
      ENGLISH_ENTRY.replace(
        "- **Capability:** Shares a type-safe contract between Bun and the renderer.",
        "- **Capability:**"
      ),
      "Capability:",
    ],
  ])(
    "rejects an empty required field in the %s catalog",
    (catalogName, chinese, english, label) => {
      expect(() => verifyFeatureDocs(chinese, english)).toThrow(
        `${catalogName} feature "typed-rpc" has an empty required label "${label}"`
      );
    }
  );
});

describe("feature catalog CLI", () => {
  test("resolves catalogs relative to the checker outside the repository cwd", async () => {
    const subprocess = Bun.spawn([process.execPath, CHECKER_PATH], {
      cwd: "/tmp",
      stdout: "pipe",
      stderr: "pipe",
    });
    const [exitCode, stdout, stderr] = await Promise.all([
      subprocess.exited,
      new Response(subprocess.stdout).text(),
      new Response(subprocess.stderr).text(),
    ]);

    expect(stderr).toBe("");
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Feature catalogs are synchronized.");
  });
});
