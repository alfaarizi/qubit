// src/components/Header.tsx
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.tsx"
import { Button } from "@/components/ui/button.tsx"
import { Separator } from "@/components/ui/separator.tsx"
import { ModeToggle } from "@/components/common/ModeToggle.tsx"
import { type LucideIcon} from "lucide-react"
import { Link } from "react-router-dom"

interface BreadcrumbData {
    label: string
    href?: string
}

interface ExternalLink {
    href: string
    icon: LucideIcon
    label: string
}

interface HeaderProps {
    breadcrumbs: BreadcrumbData[]
    externalLinks?: ExternalLink[]
}

export function Header({ breadcrumbs, externalLinks }: HeaderProps) {
    return (
        <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 px-6 items-center justify-between">
                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbs.map((item, i) => (
                            <BreadcrumbItem key={i}>
                                {item.href ? (
                                    <BreadcrumbLink asChild><Link to={item.href}>{item.label}</Link></BreadcrumbLink>
                                ) : (
                                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                )}
                                {i < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                            </BreadcrumbItem>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="flex items-center gap-2">
                    {externalLinks?.map((link, i) => (
                        <Button key={i} variant="ghost" size="icon" className="h-10 w-10" asChild>
                            <a href={link.href} target="_blank" rel="noopener noreferrer">
                                <link.icon className="h-5 w-5" />
                                <span className="sr-only">{link.label}</span>
                            </a>
                        </Button>
                    ))}
                    {externalLinks && externalLinks.length > 0 && <Separator orientation="vertical" className="h-6" />}
                    <ModeToggle />
                </div>
            </div>
        </header>
    )
}