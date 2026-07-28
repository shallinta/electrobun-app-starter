"use client";

import type { ReactNode } from "react";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export function handleConfirmDialogCancel(
  onCancel: (() => void) | undefined,
  onOpenChange: (open: boolean) => void
): void {
  if (onCancel) {
    onCancel();
    return;
  }

  onOpenChange(false);
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = "Cancel",
  confirmLabel,
  confirmVariant = "destructive",
  onConfirm,
  onCancel,
  dimBackground = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => void;
  /**
   * Called only by the explicit Cancel button. When supplied, the caller owns
   * closing the dialog. Escape and outside dismissal still use `onOpenChange`.
   */
  onCancel?: () => void;
  /**
   * Render the dimming/blur overlay behind the dialog. Set to `false` when the
   * dialog opens on top of another dialog (e.g. inside Settings) so the
   * backdrop isn't darkened a second time. Radix still blocks interaction and
   * closes on outside click without an overlay.
   */
  dimBackground?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showOverlay={dimBackground}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleConfirmDialogCancel(onCancel, onOpenChange)}
          >
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
