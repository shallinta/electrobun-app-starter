"use client";

import { Tooltip } from "@shallinta/ui/components/tooltip";
import { Button } from "@shallinta/ui/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shallinta/ui/ui/popover";
import { ArrowDownToLineIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCommands } from "@/commands";
import { useUpdateStatus } from "@/components/update-status-provider";

/**
 * The shell's persistent "update ready" affordance. It renders nothing until an
 * update is downloaded, then opens a confirmation popover so a bare icon click
 * cannot restart the app unexpectedly. The native menu exposes the same restart
 * action.
 */
export function UpdateIndicator() {
  const { t } = useTranslation("updates");
  const { readyVersion } = useUpdateStatus();
  const { executeCommand } = useCommands();
  if (!readyVersion) return null;

  return (
    <Popover>
      <Tooltip content={t("indicator.tooltip")}>
        <PopoverTrigger asChild>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={t("indicator.ariaLabel")}
            className="relative"
          >
            <ArrowDownToLineIcon />
            <span className="bg-primary absolute top-1 right-1 size-1.5 rounded-full" />
          </Button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" className="flex w-64 flex-col gap-2">
        <span className="text-sm font-medium">{t("indicator.title")}</span>
        <span className="text-muted-foreground text-xs">
          {t("indicator.description", { version: readyVersion })}
        </span>
        <Button
          size="sm"
          className="mt-1 w-full"
          onClick={() =>
            executeCommand({ type: "applyUpdateAndRestart", args: {} })
          }
        >
          {t("indicator.restartNow")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
