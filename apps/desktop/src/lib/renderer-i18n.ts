import { createInstance, type i18n as I18n } from "i18next";
import { initReactI18next } from "react-i18next";

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getTranslationResources,
  type SupportedLocale,
} from "@/shared/i18n";

export interface LocaleRPC {
  addMessageListener(
    name: "localeChanged",
    listener: (message: { locale: SupportedLocale }) => void
  ): void;
  request: {
    getLocale(params: Record<string, never>): Promise<SupportedLocale>;
    setLocale(params: { locale: SupportedLocale }): Promise<null>;
  };
}

let activeRendererI18n: I18n | null = null;

export function createRendererI18nRuntime(_dependencies: {
  documentRoot: { setAttribute(name: string, value: string): void };
  i18n?: I18n;
  onError?: (error: unknown) => void;
  rpc: LocaleRPC;
}) {
  const instance = _dependencies.i18n ?? createInstance().use(initReactI18next);
  let initialized = false;
  let pendingLocale: SupportedLocale | null = null;
  let localeQueue = Promise.resolve();

  const syncDocument = (locale: SupportedLocale): void => {
    _dependencies.documentRoot.setAttribute("lang", locale);
    _dependencies.documentRoot.setAttribute("dir", instance.dir(locale));
  };
  const applyLocale = (locale: SupportedLocale): Promise<void> => {
    const operation = localeQueue.then(async () => {
      await instance.changeLanguage(locale);
      syncDocument(locale);
    });
    localeQueue = operation.then(
      () => undefined,
      () => undefined
    );
    return operation;
  };
  const reportError =
    _dependencies.onError ??
    ((error: unknown) =>
      console.error("Failed to apply the renderer locale:", error));

  return {
    i18n: instance as I18n,
    async initialize() {
      _dependencies.rpc.addMessageListener("localeChanged", ({ locale }) => {
        pendingLocale = locale;
        if (initialized) void applyLocale(locale).catch(reportError);
      });
      const persistedLocale = await _dependencies.rpc.request.getLocale({});
      const locale = pendingLocale ?? persistedLocale;
      await instance.init({
        defaultNS: "common",
        fallbackLng: DEFAULT_LOCALE,
        interpolation: { escapeValue: false },
        lng: locale,
        ns: ["common", "settings", "menu", "commands", "updates"],
        resources: getTranslationResources(),
        supportedLngs: [...SUPPORTED_LOCALES],
      });
      initialized = true;
      syncDocument(locale);
      if (pendingLocale && pendingLocale !== locale) {
        await applyLocale(pendingLocale);
      }
      activeRendererI18n = instance;
    },
    getLocale: (): SupportedLocale => {
      const locale = instance.resolvedLanguage;
      return locale === "zh-CN" ? "zh-CN" : "en-US";
    },
    setLocale: (locale: SupportedLocale) =>
      _dependencies.rpc.request.setLocale({ locale }).then(() => undefined),
    t: instance.t.bind(instance),
  };
}

export async function initializeRendererI18n(dependencies: {
  documentRoot: { setAttribute(name: string, value: string): void };
  rpc: LocaleRPC;
}): Promise<void> {
  const runtime = createRendererI18nRuntime(dependencies);
  await runtime.initialize();
}

export function getStableRendererI18n(): I18n {
  if (!activeRendererI18n) {
    throw new Error("Renderer i18n is not initialized.");
  }
  return activeRendererI18n;
}

export async function bootstrapRenderer(dependencies: {
  initialize: () => Promise<void>;
  renderApp: () => void;
  renderFailure: (error: unknown) => void;
}): Promise<void> {
  try {
    await dependencies.initialize();
    dependencies.renderApp();
  } catch (error) {
    dependencies.renderFailure(error);
  }
}
