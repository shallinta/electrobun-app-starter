import { describe, expect, test } from "bun:test";

import { verifyFeatureDocs } from "./check-feature-docs";

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
});
