import { expect, mock, test } from "bun:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { handleLinkClick, Link, type LinkProps } from "./link";

interface AuxClickEvent {
  button: number;
  defaultPrevented: boolean;
  preventDefault: () => void;
}

function getAuxClickHandler(props: LinkProps): (event: AuxClickEvent) => void {
  const element = Link(props) as ReactElement<{
    onAuxClick: (event: AuxClickEvent) => void;
  }>;
  return element.props.onAuxClick;
}

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

test("intercepts middle clicks after running the user auxiliary click handler", () => {
  const calls: string[] = [];
  const event = {
    button: 1,
    defaultPrevented: false,
    preventDefault() {
      calls.push("preventDefault");
      this.defaultPrevented = true;
    },
  };
  const onAuxClick = getAuxClickHandler({
    href: "https://example.com/docs",
    openExternal: (href) => calls.push(`openExternal:${href}`),
    onAuxClick: () => calls.push("onAuxClick"),
  });

  onAuxClick(event);

  expect(calls).toEqual([
    "onAuxClick",
    "preventDefault",
    "openExternal:https://example.com/docs",
  ]);
});

test("honors a user auxiliary click handler that prevents the default action", () => {
  const preventDefault = mock(() => {
    event.defaultPrevented = true;
  });
  const openExternal = mock((_href: string) => {});
  const event = { button: 1, defaultPrevented: false, preventDefault };
  const onAuxClick = getAuxClickHandler({
    href: "https://example.com",
    openExternal,
    onAuxClick: (clickEvent) => clickEvent.preventDefault(),
  });

  onAuxClick(event);

  expect(preventDefault).toHaveBeenCalledTimes(1);
  expect(openExternal).not.toHaveBeenCalled();
});

test("leaves non-middle auxiliary clicks to the browser", () => {
  const preventDefault = mock(() => {});
  const openExternal = mock((_href: string) => {});
  const userOnAuxClick = mock(() => {});
  const onAuxClick = getAuxClickHandler({
    href: "https://example.com",
    openExternal,
    onAuxClick: userOnAuxClick,
  });

  onAuxClick({ button: 2, defaultPrevented: false, preventDefault });

  expect(userOnAuxClick).toHaveBeenCalledTimes(1);
  expect(preventDefault).not.toHaveBeenCalled();
  expect(openExternal).not.toHaveBeenCalled();
});

test("renders a real anchor without inventing a fallback href", () => {
  const markup = renderToStaticMarkup(
    createElement(Link, {
      openExternal: () => {},
      children: "Documentation",
    })
  );

  expect(markup).toBe("<a>Documentation</a>");
});
