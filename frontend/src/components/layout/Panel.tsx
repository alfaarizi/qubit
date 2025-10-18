import type { ReactNode } from "react";

interface PanelProps {
    children: ReactNode;
}

export function Panel({ children }: PanelProps) {
    return (
        <div className="flex h-full min-w-[235px] flex-col border border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="flex flex-col flex-1 min-h-0 p-4 gap-4">
                {children}
            </div>
        </div>
    )
}