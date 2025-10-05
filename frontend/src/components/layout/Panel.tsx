import type { ReactNode } from "react";
import type { LucideIcon } from 'lucide-react'

interface PanelProps {
    children: ReactNode
    title: string
    icon: LucideIcon
}

export function Panel({ children, title, icon: Icon }: PanelProps) {
    return (
        <div className="flex h-full min-w-[235px] flex-col border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="flex items-center gap-2 border-b border-border/50 px-6 py-4">
                <Icon className="h-5 w-5" />
                <h3 className="truncate text-lg font-semibold">{title}</h3>
            </div>
            <div className="min-h-0 p-4">{children}</div>
        </div>
    )
}