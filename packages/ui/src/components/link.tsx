"use client";

import type { AnchorHTMLAttributes } from "react";

export interface LinkClickEvent {
  defaultPrevented: boolean;
  preventDefault: () => void;
}

export interface LinkAuxClickEvent extends LinkClickEvent {
  button: number;
}

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  openExternal: (href: string) => void;
};

export function handleLinkClick<Event extends LinkClickEvent>(
  event: Event,
  href: string | undefined,
  openExternal: (href: string) => void,
  onClick?: (event: Event) => void
): void {
  onClick?.(event);
  if (event.defaultPrevented) return;

  event.preventDefault();
  if (href !== undefined) openExternal(href);
}

export function handleLinkAuxClick<Event extends LinkAuxClickEvent>(
  event: Event,
  href: string | undefined,
  openExternal: (href: string) => void,
  onAuxClick?: (event: Event) => void
): void {
  onAuxClick?.(event);
  if (event.defaultPrevented || event.button !== 1) return;

  event.preventDefault();
  if (href !== undefined) openExternal(href);
}

export function Link({
  href,
  onClick,
  onAuxClick,
  openExternal,
  ...anchorProps
}: LinkProps) {
  return (
    <a
      {...anchorProps}
      href={href}
      onClick={(event) => handleLinkClick(event, href, openExternal, onClick)}
      onAuxClick={(event) =>
        handleLinkAuxClick(event, href, openExternal, onAuxClick)
      }
    />
  );
}
