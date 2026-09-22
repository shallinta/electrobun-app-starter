import { describe, expect, test } from "bun:test";

import electrobunConfig from "../../electrobun.config";

describe("Electrobun build hooks", () => {
  test("keeps the main process on Bun during the Electrobun 2 migration", () => {
    expect(electrobunConfig.build?.mainProcess).toBe("bun");
    expect(electrobunConfig.build?.bun?.entrypoint).toBe("src/bun/index.ts");
  });

  test("uses the Icon Composer source for macOS packaging", () => {
    expect(electrobunConfig.build?.mac?.icons).toBe("AppIcon.icon");
  });

  test("does not carry the Electrobun 1 x64 signing workaround", () => {
    expect("postBuild" in electrobunConfig.scripts).toBeFalse();
    expect("postWrap" in electrobunConfig.scripts).toBeFalse();
  });

  test("repairs the macOS development display name after packaging", () => {
    expect(electrobunConfig.scripts?.postPackage).toBe(
      "scripts/fix-dev-display-name.ts"
    );
  });
});
