"use client";

import {
  DEFAULT_PRIMARY,
  usePrimaryColor,
  useTheme,
  type Theme,
} from "@shallinta/ui/components/theme-provider";
import { Button } from "@shallinta/ui/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shallinta/ui/ui/select";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useCommands } from "@/commands";
import { useLocale } from "@/hooks/use-locale";
import { useUpdateMode } from "@/hooks/use-update-mode";
import type { SupportedLocale } from "@/shared/i18n";
import type { UpdateMode } from "@/shared/updates";

import { PrimaryColorPicker } from "./primary-color-picker";
import { SettingsPage } from "./settings-page";

function SettingsRow({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-14 items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-muted-foreground px-1 text-[0.6875rem] font-medium tracking-wider uppercase">
        {title}
      </h3>
      <div className="border-border/60 divide-border/60 bg-muted/15 divide-y rounded-xl border px-4">
        {children}
      </div>
    </section>
  );
}

function RowLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      {title}
      {hint ? (
        <span className="text-muted-foreground text-xs">{hint}</span>
      ) : null}
    </span>
  );
}

export function GeneralPage() {
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  const { theme, setTheme } = useTheme();
  const { executeCommand } = useCommands();
  const { locale, isSaving: isLocaleSaving, change: setLocale } = useLocale();
  const {
    mode: updateMode,
    isSaving: isUpdateModeSaving,
    change: setUpdateMode,
  } = useUpdateMode();
  const {
    primaryColor,
    resetPrimaryColor,
    resetPrimaryColorVersion,
    setPrimaryColor,
  } = usePrimaryColor();

  return (
    <SettingsPage title={t("general")} className="overflow-y-auto">
      <div className="flex flex-col gap-7 pb-2">
        <SettingsSection title={t("appearance")}>
          <SettingsRow
            label={
              <RowLabel title={t("language.title")} hint={t("language.hint")} />
            }
          >
            <Select
              value={locale}
              disabled={isLocaleSaving}
              onValueChange={(value) =>
                void setLocale(value as SupportedLocale)
              }
            >
              <SelectTrigger className="w-32" aria-label={t("language.title")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">
                  {t("language.options.en-US")}
                </SelectItem>
                <SelectItem value="zh-CN">
                  {t("language.options.zh-CN")}
                </SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label={<RowLabel title={t("theme.title")} hint={t("theme.hint")} />}
          >
            <Select
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
            >
              <SelectTrigger className="w-32" aria-label={t("theme.title")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  {t("theme.options.light")}
                </SelectItem>
                <SelectItem value="dark">{t("theme.options.dark")}</SelectItem>
                <SelectItem value="system">
                  {t("theme.options.system")}
                </SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label={
              <RowLabel
                title={t("primaryColor.title")}
                hint={t("primaryColor.hint")}
              />
            }
          >
            <div className="flex items-center gap-2">
              {primaryColor !== DEFAULT_PRIMARY ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={resetPrimaryColor}
                >
                  {tCommon("actions.reset")}
                </Button>
              ) : null}
              <PrimaryColorPicker
                key={resetPrimaryColorVersion}
                value={primaryColor}
                onChange={setPrimaryColor}
              />
            </div>
          </SettingsRow>
        </SettingsSection>
        <SettingsSection title={t("updates.section")}>
          <SettingsRow
            label={
              <RowLabel title={t("updates.title")} hint={t("updates.hint")} />
            }
          >
            <div className="flex items-center gap-2">
              <Select
                value={updateMode}
                disabled={isUpdateModeSaving}
                onValueChange={(value) =>
                  void setUpdateMode(value as UpdateMode)
                }
              >
                <SelectTrigger
                  className="w-40"
                  aria-label={t("updates.ariaLabel")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">
                    {t("updates.options.automatic")}
                  </SelectItem>
                  <SelectItem value="manual">
                    {t("updates.options.manual")}
                  </SelectItem>
                  <SelectItem value="off">
                    {t("updates.options.off")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="lg"
                disabled={updateMode === "off" || isUpdateModeSaving}
                onClick={() =>
                  executeCommand({ type: "checkForUpdates", args: {} })
                }
              >
                {t("updates.checkNow")}
              </Button>
            </div>
          </SettingsRow>
        </SettingsSection>
      </div>
    </SettingsPage>
  );
}
