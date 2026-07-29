import { describe, expect, test } from "bun:test";

import electrobunConfig from "../../electrobun.config";

describe("Electrobun build hooks", () => {
  test("repairs the macOS development display name after packaging", () => {
    expect(electrobunConfig.scripts?.postPackage).toBe(
      "scripts/fix-dev-display-name.ts"
    );
  });
});
