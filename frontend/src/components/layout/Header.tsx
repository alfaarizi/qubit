import { Link } from "react-router-dom"
import { HelpCircle, Share2, Github, Mail, Home} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { ModeToggle } from "@/components/common/ModeToggle"
import {SaveIndicator} from "@/components/common/SaveIndicator";
import {useProject} from "@/features/project/ProjectStoreContext";
import { EditableText } from "@/components/common/EditableText";

interface HeaderProps {
    onShareClick?: () => void
    onHelpClick?: () => void
    userInitials?: string
    githubUrl?: string
    emailUrl?: string
}

export function Header({
   onShareClick,
   onHelpClick,
   userInitials = "JD",
   githubUrl = "https://github.com",
   emailUrl = "mailto:contact@example.com",
}: HeaderProps) {
    const { activeCircuitId, projectName, setProjectName } = useProject();

    return (
        <header className="h-12 w-full border-b bg-muted/50 flex items-center px-4 text-xs text-muted-foreground">
            {/* Column 1: Logo and Name */}
            <div className="flex items-center gap-2 w-52">
                <Button variant="ghost" size="icon" className="h-5 w-5" asChild>
                    <Link to="/">
                        <Home className="w-3.5 h-3.5" />
                        <span className="sr-only">Home</span>
                    </Link>
                </Button>
                <span className="font-semibold text-foreground">Qubitkit</span>
            </div>

            {/* Column 2: Breadcrumb + Cloud Status */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <nav className="flex items-center gap-1 min-w-0 truncate">
                    <span className="shrink-0">Workspace</span>
                    <span className="shrink-0">/</span>
                    <EditableText
                        value={projectName}
                        onChange={setProjectName}
                        className="font-medium text-foreground"
                        placeholder="Untitled Project"
                    />
                </nav>
                <SaveIndicator circuitId={activeCircuitId} />
            </div>

            {/* Column 3: Actions */}
            <div className="flex items-center gap-2 shrink-0">
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

                {/* User Avatar */}
                <Avatar className="w-5 h-5 bg-blue-600">
                    <AvatarFallback className="bg-blue-600 text-white text-[8px] font-semibold">
                        {userInitials}
                    </AvatarFallback>
                </Avatar>
            </div>
        </header>
    )
}