import type { TranslationResources } from "./shared/i18n";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: TranslationResources;
    strictKeyChecks: true;
  }
}
