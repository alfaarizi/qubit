import type { ReactNode } from 'react'

interface ThreeColumnLayoutProps {
    children: ReactNode
}

export function ThreeColumnLayout({ children }: ThreeColumnLayoutProps) {
    return (
        <div className="grid grid-cols-[auto_1fr_auto] gap-4 h-full overflow-hidden">
            {children}
        </div>
    )
}

const Column = ({ children }: { children: ReactNode }) => (
    <div className="flex flex-col h-full min-w-0">{children}</div>
)

ThreeColumnLayout.Left = Column
ThreeColumnLayout.Center = Column
ThreeColumnLayout.Right = Column