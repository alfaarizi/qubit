import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Plus,
    Search,
    Grid3x3,
    List as ListIcon,
    MoreVertical,
    Trash2,
    Copy,
    FileEdit,
    Clock,
    FolderOpen,
    Github,
    Mail,
    Folder,
    Users,
    Archive,
    Trash
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ModeToggle } from '@/components/common/ModeToggle';
import { UserNav } from '@/components/common/UserNav';
import { DraggableDialog } from '@/components/common/DraggableDialog';
import { useProjectsStore, type Project } from '@/stores/projectsStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CircuitThumbnail } from '@/features/circuit/components/CircuitThumbnail';
import squanderLogoLightSm from '@/assets/Squander_logo_light_sm.png';
import squanderLogoDarkSm from '@/assets/squander_logo_dark_sm.png';
import { useTheme } from '@/providers/ThemeProvider';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'yours' | 'shared' | 'archived' | 'trashed';

const sidebarItems = [
    { id: 'all' as FilterType, label: 'All Projects', icon: Folder },
    { id: 'yours' as FilterType, label: 'Your Projects', icon: FolderOpen },
    { id: 'shared' as FilterType, label: 'Shared with you', icon: Users },
    { id: 'archived' as FilterType, label: 'Archived Projects', icon: Archive },
    { id: 'trashed' as FilterType, label: 'Trashed Projects', icon: Trash },
];

export default function ProjectListPage() {
    const navigate = useNavigate();
    const { projects, loadProjects, addProject, updateProject, deleteProject, duplicateProject } = useProjectsStore();
    const { theme } = useTheme();

    // Load projects from the backend when component mounts
    useEffect(() => {
        void loadProjects();
    }, [loadProjects]);

    const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDescription, setNewProjectDescription] = useState('');
    const [renameProjectName, setRenameProjectName] = useState('');
    const [renameProjectDescription, setRenameProjectDescription] = useState('');

    // Filter projects based on filter type (for now, just show all as "yours")
    const filteredProjects = projects
        .filter((project) =>
            project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (project.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        )
        .filter(() => {
            // For now, all projects are "yours" - you can extend this later
            return filterType === 'yours' || filterType === 'all';

        })
        .sort((a, b) => b.updatedAt - a.updatedAt);

    const handleCreateProject = () => {
        if (!newProjectName.trim()) {
            toast.error('Project name is required');
            return;
        }

        const projectId = addProject({
            name: newProjectName.trim(),
            description: newProjectDescription.trim() || undefined,
            circuits: [],
            activeCircuitId: '',
        });

        setNewProjectName('');
        setNewProjectDescription('');
        setIsCreateDialogOpen(false);
        toast.success('Project created successfully');
        navigate(`/project/${projectId}`);
    };

    const handleOpenProject = (projectId: string) => {
        navigate(`/project/${projectId}`);
    };

    const handleRenameProject = () => {
        if (!selectedProject || !renameProjectName.trim()) {
            toast.error('Project name is required');
            return;
        }

        void updateProject(selectedProject.id, {
            name: renameProjectName.trim(),
            description: renameProjectDescription.trim() || undefined,
        });

        setIsRenameDialogOpen(false);
        setSelectedProject(null);
        setRenameProjectName('');
        setRenameProjectDescription('');
        toast.success('Project updated successfully');
    };

    const handleDuplicateProject = async (projectId: string) => {
        try {
            await duplicateProject(projectId);
            toast.success('Project duplicated successfully');
        } catch {
            toast.error('Failed to duplicate project');
        }
    };

    const handleDeleteProject = () => {
        if (!selectedProject) return;

        void deleteProject(selectedProject.id);
        setIsDeleteDialogOpen(false);
        setSelectedProject(null);
        toast.success('Project deleted successfully');
    };

    const openRenameDialog = (project: Project) => {
        setSelectedProject(project);
        setRenameProjectName(project.name);
        setRenameProjectDescription(project.description || '');
        setIsRenameDialogOpen(true);
    };

    const openDeleteDialog = (project: Project) => {
        setSelectedProject(project);
        setIsDeleteDialogOpen(true);
    };

    const getProjectCount = () => {
        if (filterType === 'shared') return 0;
        if (filterType === 'archived') return 0;
        if (filterType === 'trashed') return 0;
        return filteredProjects.length;
    };

    return (
        <div className="min-h-screen bg-background">
            {/* header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center px-4 mx-auto max-w-7xl">
                    <div className="flex items-center flex-1">
                        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <h1 className="font-semibold text-lg">Qubitkit</h1>
                            <span className="text-muted-foreground text-sm translate-y-[1px]">by</span>
                            <img
                                src={isDarkMode ? squanderLogoDarkSm : squanderLogoLightSm}
                                alt="Squander"
                                className="h-5"
                            />
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                        >
                            <a href="https://github.com/alfaarizi/qubit" target="_blank" rel="noopener noreferrer">
                                <Github className="h-4 w-4" />
                            </a>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                        >
                            <a href="mailto:ocswom@inf.elte.hu">
                                <Mail className="h-4 w-4" />
                            </a>
                        </Button>
                        <ModeToggle />
                        <div className="scale-75 origin-center">
                            <UserNav />
                        </div>
                    </div>
                </div>
            </header>

            {/* main Content with Sidebar */}
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="flex gap-8">
                    {/* sidebar */}
                    <aside className="w-64 flex-shrink-0" data-testid="projects-sidebar">
                        <nav className="space-y-1">
                            {sidebarItems.map((item) => {
                                const Icon = item.icon;
                                const count = item.id === 'all' || item.id === 'yours' ? projects.length : 0;
                                return (
                                    <button
                                        key={item.id}
                                        data-testid={`projects-filter-${item.id}`}
                                        onClick={() => setFilterType(item.id)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-2 text-sm rounded-lg transition-colors",
                                            filterType === item.id
                                                ? "bg-muted font-medium text-foreground"
                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="h-4 w-4" />
                                            <span>{item.label}</span>
                                        </div>
                                        {count > 0 && (
                                            <span className="text-xs text-muted-foreground">{count}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* main Content Area */}
                    <div className="flex-1 min-w-0">
                        {/* toolbar */}
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight">
                                    {sidebarItems.find(item => item.id === filterType)?.label || 'Projects'}
                                </h2>
                                <p className="text-muted-foreground mt-1">
                                    {getProjectCount()} {getProjectCount() === 1 ? 'project' : 'projects'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto" data-testid="projects-toolbar">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        data-testid="projects-search-input"
                                        placeholder="Search projects..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <div className="flex items-center gap-1 border rounded-md p-1">
                                    <Button
                                        data-testid="projects-view-toggle-grid"
                                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setViewMode('grid')}
                                    >
                                        <Grid3x3 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        data-testid="projects-view-toggle-list"
                                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setViewMode('list')}
                                    >
                                        <ListIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button data-testid="projects-new-button" onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    New Project
                                </Button>
                            </div>
                        </div>

                        {/* projects Grid/List */}
                        {filteredProjects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="rounded-full bg-muted p-6 mb-4">
                                    <FolderOpen className="h-12 w-12 text-muted-foreground" />
                                </div>
                                <h3 className="text-2xl font-semibold mb-2">
                                    {searchQuery ? 'No projects found' : filterType === 'shared' ? 'No shared projects' : filterType === 'archived' ? 'No archived projects' : filterType === 'trashed' ? 'No trashed projects' : 'No projects yet'}
                                </h3>
                                <p className="text-muted-foreground mb-6 max-w-md">
                                    {searchQuery
                                        ? 'Try adjusting your search to find what you\'re looking for.'
                                        : filterType === 'all' || filterType === 'yours'
                                        ? 'Get started by creating your first quantum circuit composer.'
                                        : 'Nothing here yet.'}
                                </p>
                                {!searchQuery && (filterType === 'all' || filterType === 'yours') && (
                                    <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Create Your First Project
                                    </Button>
                                )}
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="projects-grid">
                                {filteredProjects.map((project) => (
                                    <Card
                                        key={project.id}
                                        data-testid={`project-card-${project.id}`}
                                        className="group hover:shadow-md transition-all cursor-pointer border-border hover:border-primary/50 overflow-hidden"
                                        onClick={() => handleOpenProject(project.id)}
                                    >
                                        <div className="h-32 bg-gradient-to-br flex items-center border-t border-b justify-center overflow-hidden">
                                            <CircuitThumbnail 
                                                project={project}
                                                className="w-full h-full"
                                            />
                                        </div>

                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                                                        {project.name}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                        {project.description || 'No description'}
                                                    </p>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button data-testid={`project-actions-menu-${project.id}`} variant="ghost" size="icon" className="h-8 w-8 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem data-testid="project-action-open" onClick={(e) => { e.stopPropagation(); handleOpenProject(project.id); }}>
                                                            <FolderOpen className="h-4 w-4 mr-2" />
                                                            Open
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem data-testid="project-action-rename" onClick={(e) => { e.stopPropagation(); openRenameDialog(project); }}>
                                                            <FileEdit className="h-4 w-4 mr-2" />
                                                            Rename
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem data-testid="project-action-duplicate" onClick={(e) => { e.stopPropagation(); void handleDuplicateProject(project.id); }}>
                                                            <Copy className="h-4 w-4 mr-2" />
                                                            Duplicate
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            data-testid="project-action-delete"
                                                            onClick={(e) => { e.stopPropagation(); openDeleteDialog(project); }}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="project-metadata-timestamp">
                                                <Clock className="h-3 w-3" />
                                                {format(project.updatedAt, 'MMM d, yyyy')}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2" data-testid="projects-list">
                                {filteredProjects.map((project) => (
                                    <Card
                                        key={project.id}
                                        data-testid={`project-card-${project.id}`}
                                        className="group hover:shadow-md transition-all cursor-pointer border-border hover:border-primary/50"
                                        onClick={() => handleOpenProject(project.id)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3">
                                                        <FolderOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                                                                {project.name}
                                                            </h3>
                                                            <p className="text-sm text-muted-foreground truncate">
                                                                {project.description || 'No description'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 ml-4">
                                                    <div className="text-sm text-muted-foreground hidden sm:block" data-testid="project-metadata-circuit-count">
                                                        {project.circuits.length} {project.circuits.length === 1 ? 'circuit' : 'circuits'}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground hidden md:block min-w-[100px] text-right" data-testid="project-metadata-timestamp">
                                                        {format(project.updatedAt, 'MMM d, yyyy')}
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                            <Button data-testid={`project-actions-menu-${project.id}`} variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem data-testid="project-action-open" onClick={(e) => { e.stopPropagation(); handleOpenProject(project.id); }}>
                                                                <FolderOpen className="h-4 w-4 mr-2" />
                                                                Open
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem data-testid="project-action-rename" onClick={(e) => { e.stopPropagation(); openRenameDialog(project); }}>
                                                                <FileEdit className="h-4 w-4 mr-2" />
                                                                Rename
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem data-testid="project-action-duplicate" onClick={(e) => { e.stopPropagation(); void handleDuplicateProject(project.id); }}>
                                                                <Copy className="h-4 w-4 mr-2" />
                                                                Duplicate
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                data-testid="project-action-delete"
                                                                onClick={(e) => { e.stopPropagation(); openDeleteDialog(project); }}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* create Project Dialog */}
            <DraggableDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                title="Create New Project"
                description="Create a new quantum circuit project to get started."
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button data-testid="project-create-submit" onClick={handleCreateProject}>Create Project</Button>
                    </>
                }
            >
                <div className="space-y-4 py-4" data-testid="project-create-dialog">
                    <div className="space-y-2">
                        <Label htmlFor="name">Project Name</Label>
                        <Input
                            id="name"
                            data-testid="project-name-input"
                            placeholder="My Quantum Project"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            data-testid="project-description-input"
                            placeholder="Add a description for your project..."
                            value={newProjectDescription}
                            onChange={(e) => setNewProjectDescription(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>
            </DraggableDialog>

            {/* rename Project Dialog */}
            <DraggableDialog
                open={isRenameDialogOpen}
                onOpenChange={setIsRenameDialogOpen}
                title="Rename Project"
                description="Update the name and description of your project."
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button data-testid="project-rename-submit" onClick={handleRenameProject}>Save Changes</Button>
                    </>
                }
            >
                <div className="space-y-4 py-4" data-testid="project-rename-dialog">
                    <div className="space-y-2">
                        <Label htmlFor="rename-name">Project Name</Label>
                        <Input
                            id="rename-name"
                            data-testid="project-rename-name-input"
                            placeholder="My Quantum Project"
                            value={renameProjectName}
                            onChange={(e) => setRenameProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameProject()}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rename-description">Description (Optional)</Label>
                        <Textarea
                            id="rename-description"
                            data-testid="project-rename-description-input"
                            placeholder="Add a description for your project..."
                            value={renameProjectDescription}
                            onChange={(e) => setRenameProjectDescription(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>
            </DraggableDialog>

            {/* delete Project Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent data-testid="project-delete-dialog">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the project
                            <span className="font-semibold"> "{selectedProject?.name}"</span> and all of its circuits.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction data-testid="project-delete-confirm" onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Project
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
