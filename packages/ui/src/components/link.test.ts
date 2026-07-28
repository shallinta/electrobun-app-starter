import { expect, mock, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { handleLinkClick, Link } from "./link";

test("runs the user click handler before intercepting and opening the link", () => {
  const calls: string[] = [];
  const event = {
    defaultPrevented: false,
    preventDefault() {
      calls.push("preventDefault");
      this.defaultPrevented = true;
    },
  };

  handleLinkClick(
    event,
    "https://example.com/docs",
    (href) => calls.push(`openExternal:${href}`),
    () => calls.push("onClick")
  );

  expect(calls).toEqual([
    "onClick",
    "preventDefault",
    "openExternal:https://example.com/docs",
  ]);
});

test("honors a user click handler that prevents the default action", () => {
  const preventDefault = mock(() => {});
  const openExternal = mock((_href: string) => {});
  const event = { defaultPrevented: false, preventDefault };

  handleLinkClick(event, "https://example.com", openExternal, (clickEvent) => {
    clickEvent.defaultPrevented = true;
  });

  expect(preventDefault).not.toHaveBeenCalled();
  expect(openExternal).not.toHaveBeenCalled();
});

test("intercepts a link without an href without opening it externally", () => {
  const preventDefault = mock(() => {});
  const openExternal = mock((_href: string) => {});

  handleLinkClick(
    { defaultPrevented: false, preventDefault },
    undefined,
    openExternal
  );

  expect(preventDefault).toHaveBeenCalledTimes(1);
  expect(openExternal).not.toHaveBeenCalled();
});

test("renders a real anchor with a fallback href", () => {
  const markup = renderToStaticMarkup(
    createElement(Link, {
      openExternal: () => {},
      children: "Documentation",
    })
  );

  expect(markup).toBe('<a href="#">Documentation</a>');
});
