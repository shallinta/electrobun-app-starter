"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { electrobun } from "@/lib/electrobun";
import { resolveSupportedLocale, type SupportedLocale } from "@/shared/i18n";

export function useLocale(): {
  locale: SupportedLocale;
  isSaving: boolean;
  change: (locale: SupportedLocale) => Promise<void>;
} {
  const { i18n, t } = useTranslation("settings");
  const [isSaving, setIsSaving] = useState(false);
  const locale = resolveSupportedLocale(i18n.resolvedLanguage);

  const change = useCallback(
    async (nextLocale: SupportedLocale) => {
      const rpc = electrobun.rpc;
      if (!rpc || nextLocale === locale || isSaving) return;
      setIsSaving(true);
      try {
        await rpc.request.setLocale({ locale: nextLocale });
      } catch (error) {
        const message = t("language.saveError");
        toast.error(message);
        console.error(message, error);
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, locale, t]
  );

  return { locale, isSaving, change };
}
