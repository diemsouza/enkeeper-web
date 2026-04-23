"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import { cn } from "@/src/lib/utils";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

type MyDialogProps = React.ComponentProps<typeof Dialog>;

function MyDialog(props: MyDialogProps) {
  return <Dialog {...props} />;
}

type MyDialogContentProps = React.ComponentProps<typeof DialogContent> & {
  size?: "sm" | "md" | "lg" | "xl";
};

function MyDialogContent({
  className,
  children,
  size = "md",
  onOpenAutoFocus,
  ...props
}: MyDialogContentProps) {
  const sizeMap = {
    sm: "sm:max-w-md",
    md: "sm:max-w-2xl",
    lg: "sm:max-w-2xl lg:max-w-3xl",
    xl: "sm:max-w-3xl lg:max-w-5xl",
  };

  return (
    <DialogContent
      className={cn(
        "w-[94vw] max-h-[90dvh] p-0 overflow-hidden flex flex-col gap-0",
        sizeMap[size],
        className,
      )}
      onOpenAutoFocus={(event) => {
        onOpenAutoFocus?.(event);
        if (!event.defaultPrevented) {
          event.preventDefault();
        }
      }}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

type MyDialogHeaderProps = React.ComponentProps<"div"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
};

function MyDialogHeader({
  className,
  title,
  description,
  children,
  ...props
}: MyDialogHeaderProps) {
  if (!title && !description) {
    return (
      <VisuallyHidden.Root>
        <DialogHeader>
          <DialogTitle></DialogTitle>
        </DialogHeader>
      </VisuallyHidden.Root>
    );
  }

  return (
    <DialogHeader
      className={cn(
        "px-4 py-3 border-b flex flex-row items-center justify-between gap-4 shrink-0 text-left",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        {title ? <DialogTitle className="truncate">{title}</DialogTitle> : null}
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
      </div>

      {children}
    </DialogHeader>
  );
}

type MyDialogBodyProps = React.ComponentProps<"div">;

function MyDialogBody({ className, children, ...props }: MyDialogBodyProps) {
  return (
    <div
      className={cn(
        "px-4 py-4 flex-1 min-h-0 overflow-y-auto space-y-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type MyDialogFooterProps = React.ComponentProps<"div">;

function MyDialogFooter({
  className,
  children,
  ...props
}: MyDialogFooterProps) {
  return (
    <div
      className={cn(
        "px-4 py-3 border-t shrink-0 flex items-center justify-end gap-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export {
  MyDialog,
  MyDialogContent,
  MyDialogHeader,
  MyDialogBody,
  MyDialogFooter,
};
