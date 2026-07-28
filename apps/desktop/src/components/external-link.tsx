"use client";

import { Link, type LinkProps } from "@shallinta/ui/components/link";
import { useCallback } from "react";

import { useCommands } from "@/commands";

export type ExternalLinkProps = Omit<LinkProps, "openExternal">;

export function ExternalLink(props: ExternalLinkProps) {
  const { executeCommand } = useCommands();
  const openExternal = useCallback(
    (href: string) => executeCommand({ type: "openLink", args: { url: href } }),
    [executeCommand]
  );

  return <Link {...props} openExternal={openExternal} />;
}
