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
        <main className="flex-1 overflow-hidden">
            {children}
        </main>
    )
}

Layout.Footer = function LayoutFooter({ children }: { children: ReactNode }) {
    return <footer>{children}</footer>
}