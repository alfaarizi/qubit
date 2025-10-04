import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'

interface SidebarProps {
    children: React.ReactNode
    title: string
    icon: LucideIcon
    side: 'left' | 'right'
    defaultOpen?: boolean
    width?: number
    minWidth?: number
}

export function Sidebar({
    children,
    title,
    icon: Icon,
    side,
    defaultOpen = true,
    width,
    minWidth
}: SidebarProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    const isLeft = side === 'left'
    const defaultWidth = isLeft ? 280 : 320
    const defaultMinWidth = isLeft ? 110 : 200

    const ChevronIcon = isOpen ? (isLeft ? ChevronLeft : ChevronRight) : (isLeft ? ChevronRight : ChevronLeft)

    return (
        <div
            className="transition-all duration-300 h-full"
            style={{
                width: isOpen ? `${width || defaultWidth}px` : '48px',
                minWidth: isOpen ? `${minWidth || defaultMinWidth}px` : '48px',
                maxWidth: '90vw'
            }}
        >
            <Card className="h-full rounded-none border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 overflow-hidden">
                {isOpen ? (
                    <>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div className={`flex items-center gap-2 ${!isLeft && 'order-2'}`}>
                                <Icon className="h-5 w-5" />
                                <CardTitle>{title}</CardTitle>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                                <ChevronIcon className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>{children}</CardContent>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center cursor-pointer" onClick={() => setIsOpen(true)}>
                        <ChevronIcon className="h-6 w-6" />
                        <Icon className="h-5 w-5 my-3 text-muted-foreground" />
                        <div className="text-sm text-muted-foreground font-medium leading-loose" style={{ width: '1ch', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                            {title.replace(/ /g, '\n\n')}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}