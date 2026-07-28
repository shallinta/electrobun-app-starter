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

import { useCommands } from "@/commands";
import { useUpdateMode } from "@/hooks/use-update-mode";
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
  const { theme, setTheme } = useTheme();
  const { executeCommand } = useCommands();
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
    <SettingsPage title="General" className="overflow-y-auto">
      <div className="flex flex-col gap-7 pb-2">
        <SettingsSection title="Appearance">
          <SettingsRow
            label={
              <RowLabel
                title="Language"
                hint="English only for now — more languages can be added later."
              />
            }
          >
            <Select defaultValue="en-US" disabled>
              <SelectTrigger className="w-32" aria-label="Language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">English (US)</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label={
              <RowLabel
                title="Theme"
                hint="Match your system setting, or force light or dark."
              />
            }
          >
            <Select
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
            >
              <SelectTrigger className="w-32" aria-label="Theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
          <SettingsRow
            label={
              <RowLabel
                title="Primary color"
                hint="The accent color for buttons, links, and highlights."
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
                  Reset
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
        <SettingsSection title="Updates">
          <SettingsRow
            label={
              <RowLabel
                title="Software updates"
                hint="Automatic downloads updates in the background and prompts you to restart."
              />
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
                <SelectTrigger className="w-40" aria-label="Software updates">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Check manually</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="lg"
                disabled={updateMode === "off" || isUpdateModeSaving}
                onClick={() =>
                  executeCommand({ type: "checkForUpdates", args: {} })
                }
              >
                Check now
              </Button>
            </div>
          </SettingsRow>
        </SettingsSection>
      </div>
    </SettingsPage>
  );
}
