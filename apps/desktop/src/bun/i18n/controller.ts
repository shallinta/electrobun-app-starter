import type { SupportedLocale } from "../../shared/i18n";
import { isSupportedLocale } from "../../shared/i18n";

import type { LocaleStateStore } from "./state";

export interface LocaleControllerDependencies {
  store: LocaleStateStore;
  activateLocale: (locale: SupportedLocale) => Promise<void>;
  onLocaleChanged: (locale: SupportedLocale) => void;
}

export interface LocaleController {
  initialize(): Promise<void>;
  getLocale(): SupportedLocale;
  setLocale(locale: SupportedLocale): Promise<void>;
}

export function createLocaleController(
  dependencies: LocaleControllerDependencies
): LocaleController {
  let currentLocale: SupportedLocale = "en-US";
  let mutationQueue: Promise<void> = Promise.resolve();

  const enqueue = (operation: () => Promise<void>): Promise<void> => {
    const queued = mutationQueue.then(operation);
    mutationQueue = queued.then(
      () => undefined,
      () => undefined
    );
    return queued;
  };

  return {
    async initialize() {
      currentLocale = await dependencies.store.getLocale();
      await dependencies.activateLocale(currentLocale);
    },
    getLocale: () => currentLocale,
    async setLocale(locale) {
      if (!isSupportedLocale(locale)) {
        throw new Error(`Unsupported locale: ${String(locale)}`);
      }
      await enqueue(async () => {
        if (locale === currentLocale) return;
        const previousLocale = currentLocale;
        await dependencies.store.setLocale(locale);
        try {
          await dependencies.activateLocale(locale);
        } catch (error) {
          await dependencies.store.setLocale(previousLocale);
          await dependencies.activateLocale(previousLocale);
          throw error;
        }
        currentLocale = locale;
        dependencies.onLocaleChanged(locale);
      });
    },
  };
}
