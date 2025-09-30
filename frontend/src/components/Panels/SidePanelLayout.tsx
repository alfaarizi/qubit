import { type ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';

interface SidePanelLayoutProps {
    children: ReactNode;
}

export function SidePanelLayout({ children }: SidePanelLayoutProps) {
    return (
        <div className="flex h-full w-full gap-4">
            {children}
        </div>
    );
}

interface SidePanelProps {
    children: ReactNode;
    title: string;
    icon: LucideIcon;
    side: 'left' | 'right';
    defaultOpen?: boolean;
}

export function SidePanel({ children, title, icon: Icon, side, defaultOpen = true }: SidePanelProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const isLeft = side === 'left';
    const width = isOpen ? (isLeft ? 280 : 320) : 48;

    return (
        <div className="transition-all duration-300" style={{ width: `${width}px` }}>
            <Card className="h-full border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 overflow-hidden">
                {isOpen ? (
                    <>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div className={`flex items-center gap-2 ${isLeft ? '' : 'order-2'}`}>
                                <Icon className="h-5 w-5" />
                                <CardTitle>{title}</CardTitle>
                            </div>
                            <Button variant="ghost" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                                {isLeft ? <ChevronLeft className="!h-6 !w-6" /> : <ChevronRight className="!h-6 !w-6" />}
                            </Button>
                        </CardHeader>
                        <CardContent>{children}</CardContent>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center cursor-pointer pt-1" onClick={() => setIsOpen(true)}>
                        {isLeft ? <ChevronRight className="h-6 w-6 mb-4" /> : <ChevronLeft className="h-6 w-6 mb-4" />}
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <Icon className="h-5 w-5 mb-3 text-muted-foreground" />
                            <div
                                className="text-sm text-muted-foreground font-medium leading-loose"
                                style={{ wordBreak: 'break-all', width: '1ch', whiteSpace: 'pre-wrap' }}
                            >
                                {title.replace(/ /g, '\n\n')}
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}