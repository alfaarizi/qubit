import { Link } from "react-router-dom"
import { HelpCircle, Share2, Github, Mail, Home} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { ModeToggle } from "@/components/common/ModeToggle"
import { UserNav } from "@/components/common/UserNav"
import {SaveIndicator} from "@/components/common/SaveIndicator";
import {useComposer} from "@/features/composer/ComposerStoreContext.tsx";
import { EditableText } from "@/components/common/EditableText";
import type { ReactNode } from "react";

interface HeaderProps {
    onShareClick?: () => void
    onHelpClick?: () => void
    githubUrl?: string
    emailUrl?: string
    collaboratorPresence?: ReactNode
}

export function Header({
   onShareClick,
   onHelpClick,
   githubUrl = "https://github.com",
   emailUrl = "mailto:contact@example.com",
   collaboratorPresence,
}: HeaderProps) {
    const { activeCircuitId, projectName, setProjectName } = useComposer();

    return (
        <header className="h-12 w-full border-b bg-muted/50 flex items-center px-4 text-xs text-muted-foreground">
            {/* Column 1: Logo and Name */}
            <div className="flex items-center gap-2 w-52">
                <span className="font-semibold text-foreground">Qubitkit</span>
                <Separator orientation="vertical" className="h-4" />
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5" asChild>
                                <Link to="/project">
                                    <Home className="w-3.5 h-3.5" />
                                    <span className="sr-only">Back to projects</span>
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Back to your projects</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Column 2: Project Name + Save Status */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <EditableText
                    value={projectName}
                    onChange={setProjectName}
                    className="font-medium text-foreground"
                    placeholder="Untitled Project"
                />
                <SaveIndicator circuitId={activeCircuitId} />
            </div>

            {/* Column 3: Actions */}
            <div className="flex items-center gap-2 shrink-0">
            {/* Collaborators Presence */}
                {collaboratorPresence}

            {/* Share Button */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onShareClick}
                                className="h-5 w-5"
                            >
                                <Share2 className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Share</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* Help Button */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onHelpClick}
                                className="h-5 w-5"
                            >
                                <HelpCircle className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Help & Documentation</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="flex items-center h-5">
                    <Separator orientation="vertical" />
                </div>

                {/* GitHub Link */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                asChild
                            >
                                <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                                    <Github className="w-3.5 h-3.5" />
                                    <span className="sr-only">GitHub</span>
                                </a>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>GitHub Repository</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* Email Link */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                asChild
                            >
                                <a href={emailUrl}>
                                    <Mail className="w-3.5 h-3.5" />
                                    <span className="sr-only">Email</span>
                                </a>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Contact via Email</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* Mode Toggle */}
                <ModeToggle />

                <div className="flex items-center h-5">
                    <Separator orientation="vertical" />
                </div>

                {/* User Profile */}
                <div className="scale-[0.7] origin-left">
                    <UserNav />
                </div>
            </div>
        </header>
    )
}