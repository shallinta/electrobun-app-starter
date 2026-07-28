"use client";

import { Dialog, DialogContent } from "@shallinta/ui/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@shallinta/ui/ui/tabs";
import { Info, SlidersHorizontal } from "lucide-react";

import type { SettingsTab } from "@/shared/commands";

import pkg from "../../../package.json";

import { GeneralPage } from "./general-page";
import { SettingsPage } from "./settings-page";

function AboutPage() {
  return (
    <SettingsPage title="About">
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <div className="text-lg font-semibold">Electrobun App Starter</div>
        <div className="text-muted-foreground text-sm">
          Version {pkg.version}
        </div>
      </div>
    </SettingsPage>
  );
}

const TABS = [
  {
    value: "general",
    label: "General",
    icon: SlidersHorizontal,
    Page: GeneralPage,
  },
  { value: "about", label: "About", icon: Info, Page: AboutPage },
] as const;

export function SettingsDialog({
  open,
  onOpenChange,
  tab,
  onTabChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl! gap-0 p-0"
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <Tabs
          className="h-[75vh] w-full gap-0"
          orientation="vertical"
          value={tab}
          onValueChange={(value) => onTabChange(value as SettingsTab)}
        >
          <aside className="bg-muted/30 flex w-50 shrink-0 flex-col gap-2 border-r p-3">
            <header>
              <div className="text-base font-medium">Settings</div>
            </header>
            <TabsList className="h-fit w-full flex-col gap-0.5 bg-transparent p-0">
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="w-full">
                  <Icon />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </aside>
          <div className="min-w-0 grow">
            {TABS.map(({ value, Page }) => (
              <TabsContent key={value} value={value} className="size-full">
                <Page />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
