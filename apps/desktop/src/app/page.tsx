import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@shallinta/ui/ui/resizable";
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { usePanelRef } from "react-resizable-panels";

import { CommandProvider, useCommands, useRegisterCommands } from "@/commands";
import { UpdateIndicator } from "@/components/update-indicator";
import { UpdateStatusProvider } from "@/components/update-status-provider";
import { electrobun } from "@/lib/electrobun";
import { persistSidebarSize, readSidebarSize } from "@/lib/sidebar-size";
import type { SettingsTab } from "@/shared/commands";

const SettingsDialog = lazy(() =>
  import("@/components/settings/settings-dialog").then((module) => ({
    default: module.SettingsDialog,
  }))
);
const CommandPalette = lazy(() =>
  import("@/components/command-palette").then((module) => ({
    default: module.CommandPalette,
  }))
);

function LazyMount({ open, children }: { open: boolean; children: ReactNode }) {
  const mounted = useRef(false);
  if (open) mounted.current = true;
  if (!mounted.current) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
}

export function Page() {
  return (
    <CommandProvider>
      <UpdateStatusProvider>
        <PageInner />
      </UpdateStatusProvider>
    </CommandProvider>
  );
}

function PageInner() {
  const { t } = useTranslation("common");
  const { executeCommand } = useCommands();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const sidebarPanelRef = usePanelRef();
  const [defaultSidebarSize] = useState(readSidebarSize);

  useRegisterCommands({
    openSettings: ({ tab }) => {
      setSettingsTab(tab ?? "general");
      setSettingsOpen(true);
    },
    openCommandPalette: () => setCommandPaletteOpen(true),
    toggleSidebar: () => {
      const panel = sidebarPanelRef.current;
      if (!panel) return;
      if (panel.isCollapsed()) {
        panel.expand();
        return;
      }
      panel.collapse();
    },
  });

  useEffect(() => {
    const rpc = electrobun.rpc;
    if (!rpc) return;
    rpc.addMessageListener("executeCommand", executeCommand);
    return () => rpc.removeMessageListener("executeCommand", executeCommand);
  }, [executeCommand]);

  return (
    <div className="relative flex size-full flex-col">
      <main className="min-h-0 grow">
        <ResizablePanelGroup>
          <ResizablePanel
            className="bg-sidebar flex items-center justify-center"
            panelRef={sidebarPanelRef}
            collapsible
            collapsedSize={0}
            defaultSize={defaultSidebarSize}
            minSize={200}
            onResize={({ inPixels }) => persistSidebarSize(inPixels)}
          >
            <span className="text-muted-foreground text-sm">
              {t("shell.navigationPlaceholder")}
            </span>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel
            className="relative flex items-center justify-center"
            minSize={640}
          >
            <div className="absolute top-4 right-4">
              <UpdateIndicator />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-semibold">{t("appName")}</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {t("shell.contentPlaceholder")}
              </p>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
      <LazyMount open={settingsOpen}>
        <SettingsDialog
          tab={settingsTab}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onTabChange={setSettingsTab}
        />
      </LazyMount>
      <LazyMount open={commandPaletteOpen}>
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          blacklist={[
            "openSettings",
            "openCommandPalette",
            "openLink",
            "toggleMaximized",
          ]}
        />
      </LazyMount>
    </div>
  );
}
