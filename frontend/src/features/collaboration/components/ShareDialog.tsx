import { useState, useEffect } from 'react';
import { Copy, Check, Trash2, Mail, Link as LinkIcon, Crown, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { DraggableDialog } from '@/components/common/DraggableDialog';
import { toast } from 'sonner';
import type { Project } from '@/types/project';
import type { CollaboratorRole } from '@/features/collaboration/types';
import { collaborationApi } from '@/lib/api/collaboration';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onProjectUpdate?: (project: Project) => void;
}

export function ShareDialog({ open, onOpenChange, project, onProjectUpdate }: ShareDialogProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [editLinkCopied, setEditLinkCopied] = useState(false);
  const [viewLinkCopied, setViewLinkCopied] = useState(false);
  const [editLink, setEditLink] = useState<string | null>(null);
  const [viewLink, setViewLink] = useState<string | null>(null);
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);
  const isOwner = project?.userRole === 'owner';

  // auto-generate links when dialog opens
  useEffect(() => {
    if (project && open && isOwner) {
      const generateLinks = async () => {
        setIsGeneratingLinks(true);
        try {
          // api returns existing link if active, creates new if not
          const editResponse = await collaborationApi.generateShareLink(project.id, { linkType: 'edit' });
          setEditLink(editResponse.url);
          const viewResponse = await collaborationApi.generateShareLink(project.id, { linkType: 'view' });
          setViewLink(viewResponse.url);
        } catch (error) {
          console.error('Failed to generate links:', error);
        } finally {
          setIsGeneratingLinks(false);
        }
      };
      void generateLinks();
    }
  }, [project, open, isOwner]);

  const handleInviteCollaborator = async () => {
    if (!project || !inviteEmail.trim() || !isOwner) return;
    setIsInviting(true);
    try {
      const updatedProject = await collaborationApi.inviteCollaborator(project.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      onProjectUpdate?.(updatedProject);
      setInviteEmail('');
      toast.success(`Invited ${inviteEmail} as ${inviteRole}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to invite collaborator';
      toast.error(message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorEmail: string) => {
    if (!project || !isOwner) return;
    try {
      const updatedProject = await collaborationApi.removeCollaborator(project.id, collaboratorEmail);
      onProjectUpdate?.(updatedProject);
      toast.success('Collaborator removed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove collaborator';
      toast.error(message);
    }
  };

  const handleUpdateRole = async (collaboratorEmail: string, newRole: CollaboratorRole) => {
    if (!project || !isOwner) return;
    try {
      const updatedProject = await collaborationApi.updateCollaboratorRole(
        project.id,
        collaboratorEmail,
        { role: newRole }
      );
      onProjectUpdate?.(updatedProject);
      toast.success('Role updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update role';
      toast.error(message);
    }
  };

  const copyToClipboard = async (text: string, type: 'edit' | 'view') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'edit') {
        setEditLinkCopied(true);
        setTimeout(() => setEditLinkCopied(false), 2000);
      } else {
        setViewLinkCopied(true);
        setTimeout(() => setViewLinkCopied(false), 2000);
      }
      toast.success('Link copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const getRoleIcon = (role: CollaboratorRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'editor':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (!project) return null;

  return (
    <DraggableDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Share "${project.name}"`}
      description={isOwner ? "Invite collaborators and manage access to your project." : "View collaborators on this project."}
    >
      <div className="space-y-6 py-4">
        {isOwner && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Invite by Email</Label>
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInviteCollaborator()}
                  className="flex-1"
                />
                <Select value={inviteRole} onValueChange={(value: CollaboratorRole) => setInviteRole(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleInviteCollaborator} disabled={!inviteEmail.trim() || isInviting}>
                  Invite
                </Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Share Links</Label>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Anyone with this link can edit</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={editLink || (isGeneratingLinks ? 'Generating...' : 'Link unavailable')}
                    className="flex-1 font-mono text-xs"
                    disabled={isGeneratingLinks}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => editLink && copyToClipboard(editLink, 'edit')}
                    disabled={!editLink || isGeneratingLinks}
                  >
                    {editLinkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Anyone with this link can view</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={viewLink || (isGeneratingLinks ? 'Generating...' : 'Link unavailable')}
                    className="flex-1 font-mono text-xs"
                    disabled={isGeneratingLinks}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => viewLink && copyToClipboard(viewLink, 'view')}
                    disabled={!viewLink || isGeneratingLinks}
                  >
                    {viewLinkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}
        <div className="space-y-4">
          <Label className="text-sm font-semibold">Collaborators ({project.collaborators.length + 1})</Label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <Avatar className="h-8 w-8">
                <AvatarImage src={undefined} />
                <AvatarFallback className="text-xs">OW</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Owner</p>
                <p className="text-xs text-muted-foreground truncate">{project.id}</p>
              </div>
              <div className="flex items-center gap-2">
                {getRoleIcon('owner')}
                <span className="text-xs text-muted-foreground">Owner</span>
              </div>
            </div>
            {project.collaborators.map((collaborator) => (
              <div key={collaborator.email} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={collaborator.profileUrl} />
                  <AvatarFallback className="text-xs">
                    {getInitials(collaborator.firstName, collaborator.lastName, collaborator.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {collaborator.firstName && collaborator.lastName
                      ? `${collaborator.firstName} ${collaborator.lastName}`
                      : collaborator.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{collaborator.email}</p>
                </div>
                {isOwner ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={collaborator.role}
                      onValueChange={(value: CollaboratorRole) =>
                        handleUpdateRole(collaborator.email, value)
                      }
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveCollaborator(collaborator.email)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {getRoleIcon(collaborator.role)}
                    <span className="text-xs text-muted-foreground capitalize">{collaborator.role}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </div>
    </DraggableDialog>
  );
}
