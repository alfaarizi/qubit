import type { ReactNode } from 'react'

interface LayoutProps {
    children: ReactNode
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="flex flex-col h-screen bg-background">
            {children}
        </div>
    )
}

Layout.Header = function LayoutHeader({ children }: { children: ReactNode }) {
    return <header>{children}</header>
}

Layout.Content = function LayoutContent({ children }: { children: ReactNode }) {
    return (
        <main className="flex-1 overflow-hidden bg-slate-50 dark:bg-neutral-950">
            <div
                className="h-full w-full"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(128, 128, 128, 0.12) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(128, 128, 128, 0.12) 1px, transparent 1px)
                    `,
                    backgroundSize: '24px 24px'
                }}
            >
                {children}
            </div>
        </main>
    );
}

Layout.Footer = function LayoutFooter({ children }: { children: ReactNode }) {
    return <footer>{children}</footer>
}