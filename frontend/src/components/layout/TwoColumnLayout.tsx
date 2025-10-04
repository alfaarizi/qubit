import type { ReactNode } from 'react'

interface TwoColumnLayoutProps {
    children: ReactNode
}

export function TwoColumnLayout({ children }: TwoColumnLayoutProps) {
    return (
        <div className="grid grid-cols-[auto_1fr] h-full overflow-hidden">
            {children}
        </div>
    )
}

const Column = ({ children }: { children: ReactNode }) => (
    <div className="flex flex-col h-full min-w-0">{children}</div>
)

TwoColumnLayout.Left = Column
TwoColumnLayout.Right = Column