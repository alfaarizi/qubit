import { useState } from "react"
import { Link, useParams, useLocation } from "react-router-dom"
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
import {useComposer} from "@/features/composer/ComposerStoreContext.tsx";
import { EditableText } from "@/components/common/EditableText";
import { ShareDialog } from "@/features/collaboration/components/ShareDialog";
import { useCollaborationStore } from "@/stores/collaborationStore";
import { getInitials } from "@/features/collaboration/utils";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
    onHelpClick?: () => void
    githubUrl?: string
    emailUrl?: string
}

export function Header({
   onHelpClick,
   githubUrl = "https://github.com",
   emailUrl = "mailto:contact@example.com",
}: HeaderProps) {
    const { user, isAuthenticated } = useAuth();
    const { activeCircuitId, projectName, setProjectName } = useComposer();
    const { collaborators } = useCollaborationStore();
    const { projectId } = useParams<{ projectId: string }>();
    const location = useLocation();
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

    const userEmail = user?.email || "user@example.com";
    const userInitials = user?.email ? getInitials(user.email) : "U";
    const onlineCollaborators = collaborators.filter(c => c.isOnline && c.email !== userEmail);

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
                {/* Online Collaborators */}
                {onlineCollaborators.length > 0 && (
                    <>
                        <div className="flex items-center -space-x-2">
                            {onlineCollaborators.slice(0, 3).map((collaborator) => (
                                <TooltipProvider key={collaborator.id}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Avatar className="h-6 w-6 border-2 border-background" style={{ backgroundColor: collaborator.color }}>
                                                <AvatarFallback className="text-white text-[8px] font-semibold" style={{ backgroundColor: collaborator.color }}>
                                                    {getInitials(collaborator.email)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{collaborator.email} (Online)</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ))}
                            {onlineCollaborators.length > 3 && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Avatar className="h-6 w-6 border-2 border-background bg-muted">
                                                <AvatarFallback className="bg-muted text-foreground text-[8px] font-semibold">
                                                    +{onlineCollaborators.length - 3}
                                                </AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{onlineCollaborators.length - 3} more online</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <Separator orientation="vertical" className="h-5" />
                    </>
                )}
                {/* Share Button or Auth Buttons */}
                {isAuthenticated ? (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsShareDialogOpen(true)}
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
                ) : (
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" asChild>
                            <Link to="/signin" state={{ from: location.pathname }}>
                                Sign In
                            </Link>
                        </Button>
                        <span className="text-muted-foreground">|</span>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" asChild>
                            <Link to="/signup" state={{ from: location.pathname }}>
                                Sign Up
                            </Link>
                        </Button>
                    </div>
                )}

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
            {projectId && isAuthenticated && (
                <ShareDialog
                    open={isShareDialogOpen}
                    onOpenChange={setIsShareDialogOpen}
                    projectId={projectId}
                    currentUserEmail={userEmail}
                />
            )}
        </header>
    )
}