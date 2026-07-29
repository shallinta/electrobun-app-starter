import { describe, expect, test } from "bun:test";

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getTranslationResources,
  isSupportedLocale,
  resolveSupportedLocale,
} from ".";

function collectLeafKeys(
  value: unknown,
  prefix = "",
  keys: string[] = []
): string[] {
  if (typeof value !== "object" || value === null) {
    keys.push(prefix);
    return keys;
  }
  for (const [key, child] of Object.entries(value)) {
    collectLeafKeys(child, prefix ? `${prefix}.${key}` : key, keys);
  }
  return keys;
}

describe("desktop locales", () => {
  test("only supports en-US and zh-CN", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en-US", "zh-CN"]);
    expect(DEFAULT_LOCALE).toBe("en-US");
    expect(isSupportedLocale("en-US")).toBe(true);
    expect(isSupportedLocale("zh-CN")).toBe(true);
    expect(isSupportedLocale("en")).toBe(false);
    expect(isSupportedLocale("fr-FR")).toBe(false);
  });

  test("maps system Chinese variants to zh-CN and everything else to en-US", () => {
    expect(resolveSupportedLocale("zh")).toBe("zh-CN");
    expect(resolveSupportedLocale("zh-Hant-TW")).toBe("zh-CN");
    expect(resolveSupportedLocale("ZH_cn")).toBe("zh-CN");
    expect(resolveSupportedLocale("en-GB")).toBe("en-US");
    expect(resolveSupportedLocale("fr-FR")).toBe("en-US");
    expect(resolveSupportedLocale(undefined)).toBe("en-US");
  });

  test("keeps every namespace and translation key synchronized", () => {
    const resources = getTranslationResources();
    expect(Object.keys(resources)).toEqual(["en-US", "zh-CN"]);
    expect(collectLeafKeys(resources["zh-CN"])).toEqual(
      collectLeafKeys(resources["en-US"])
    );
  });

  test("contains localized shell, settings, menu, command, and update copy", () => {
    const resources = getTranslationResources();

    expect(resources["en-US"].common.shell.navigationPlaceholder).toBe(
      "Add your navigation here."
    );
    expect(resources["zh-CN"].common.shell.navigationPlaceholder).toBe(
      "在这里添加导航。"
    );
    expect(
      (
        resources["zh-CN"].common as (typeof resources)["zh-CN"]["common"] & {
          startupFailure?: { retry: string };
        }
      ).startupFailure?.retry
    ).toBe("重试");
    expect(resources["zh-CN"].settings.language.title).toBe("语言");
    expect(resources["zh-CN"].menu.file.title).toBe("文件");
    expect(resources["zh-CN"].commands.toggleSidebar).toBe("切换侧栏");
    expect(resources["zh-CN"].updates.dialog.ready.title).toBe("更新已就绪");
    expect(resources["zh-CN"].updates.dialog.error.description).toBe(
      "请重试，并查看应用日志了解详情。"
    );
  });
});
