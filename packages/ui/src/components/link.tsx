"use client";

import type { AnchorHTMLAttributes } from "react";

export interface LinkClickEvent {
  defaultPrevented: boolean;
  preventDefault: () => void;
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

export function Link({
  href,
  onClick,
  openExternal,
  ...anchorProps
}: LinkProps) {
  return (
    <a
      {...anchorProps}
      href={href ?? "#"}
      onClick={(event) => handleLinkClick(event, href, openExternal, onClick)}
    />
  );
}
