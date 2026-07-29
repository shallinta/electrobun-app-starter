import { createInstance } from "i18next";

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getTranslationResources,
  type SupportedLocale,
} from "../../shared/i18n";

const bunI18n = createInstance();

await bunI18n.init({
  defaultNS: "common",
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  lng: DEFAULT_LOCALE,
  ns: ["common", "settings", "menu", "commands", "updates"],
  resources: getTranslationResources(),
  supportedLngs: [...SUPPORTED_LOCALES],
});

export async function activateBunLocale(
  locale: SupportedLocale
): Promise<void> {
  await bunI18n.changeLanguage(locale);
}

export const translate = bunI18n.t.bind(bunI18n);
