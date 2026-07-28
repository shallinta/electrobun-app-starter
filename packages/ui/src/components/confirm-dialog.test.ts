import { expect, mock, test } from "bun:test";

import { handleConfirmDialogCancel } from "./confirm-dialog";

test("explicit cancel calls onCancel without closing when provided", () => {
  const onCancel = mock(() => {});
  const onOpenChange = mock((_open: boolean) => {});

  handleConfirmDialogCancel(onCancel, onOpenChange);

  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onOpenChange).not.toHaveBeenCalled();
});

test("explicit cancel closes the dialog when onCancel is not provided", () => {
  const onOpenChange = mock((_open: boolean) => {});

  handleConfirmDialogCancel(undefined, onOpenChange);

  expect(onOpenChange).toHaveBeenCalledTimes(1);
  expect(onOpenChange).toHaveBeenCalledWith(false);
});
