"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DialogContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
} | null>(null);

function useDialog() {
    const context = React.useContext(DialogContext);
    if (!context) {
        throw new Error("useDialog must be used within a DialogProvider");
    }
    return context;
}

interface DialogProps {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function Dialog({ children, open: controlledOpen, onOpenChange }: DialogProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;

    const setOpen = React.useCallback((newOpen: boolean) => {
        if (onOpenChange) {
            onOpenChange(newOpen);
        }
        if (!isControlled) {
            setUncontrolledOpen(newOpen);
        }
    }, [isControlled, onOpenChange]);

    return (
        <DialogContext.Provider value={{ open, setOpen }}>
            {children}
        </DialogContext.Provider>
    );
}

export function DialogTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
    const { setOpen } = useDialog();

    // Clone element if asChild is true to attach onClick
    if (asChild && React.isValidElement(children)) {
        const childProps = children.props as { onClick?: (e: React.MouseEvent) => void };
        return React.cloneElement(children as React.ReactElement<any>, {
            onClick: (e: React.MouseEvent) => {
                childProps.onClick?.(e);
                setOpen(true);
            }
        });
    }

    return (
        <button onClick={() => setOpen(true)}>{children}</button>
    );
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
    const { open, setOpen } = useDialog();

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto">
            <div
                className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
                onClick={() => setOpen(false)}
            />
            <div className={cn("relative z-50 w-full max-w-lg rounded-xl border border-border bg-card p-6 text-foreground shadow-xl", className)}>
                <button
                    onClick={() => setOpen(false)}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
                {children}
            </div>
        </div>
    );
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>
            {children}
        </div>
    );
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
            {children}
        </h2>
    );
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p className={cn("text-sm text-muted-foreground", className)}>
            {children}
        </p>
    );
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>
            {children}
        </div>
    );
}
