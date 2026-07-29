import enUSCommands from "./resources/en-US/commands.json";
import enUSCommon from "./resources/en-US/common.json";
import enUSMenu from "./resources/en-US/menu.json";
import enUSSettings from "./resources/en-US/settings.json";
import enUSUpdates from "./resources/en-US/updates.json";
import zhCNCommands from "./resources/zh-CN/commands.json";
import zhCNCommon from "./resources/zh-CN/common.json";
import zhCNMenu from "./resources/zh-CN/menu.json";
import zhCNSettings from "./resources/zh-CN/settings.json";
import zhCNUpdates from "./resources/zh-CN/updates.json";

export const SUPPORTED_LOCALES = ["en-US", "zh-CN"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "en-US";

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === "en-US" || value === "zh-CN";
}

export function resolveSupportedLocale(
  locale: string | undefined
): SupportedLocale {
  return locale && /^zh(?:[-_]|$)/i.test(locale) ? "zh-CN" : DEFAULT_LOCALE;
}

const resources = {
  "en-US": {
    common: enUSCommon,
    settings: enUSSettings,
    menu: enUSMenu,
    commands: enUSCommands,
    updates: enUSUpdates,
  },
  "zh-CN": {
    common: zhCNCommon,
    settings: zhCNSettings,
    menu: zhCNMenu,
    commands: zhCNCommands,
    updates: zhCNUpdates,
  },
} as const;

export type TranslationResources = (typeof resources)["en-US"];

export function getTranslationResources() {
  return resources;
}
