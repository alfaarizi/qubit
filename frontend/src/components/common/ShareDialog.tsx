import { useState, useEffect } from 'react';
import { Copy, Mail, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DraggableDialog } from './DraggableDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { collaborationApi } from '@/lib/api/collaboration';
import type { ProjectPermission, ShareLink, CollaboratorRole } from '@/types/collaboration';
import { useAuthStore } from '@/stores/authStore';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  isOwner: boolean;
}

export function ShareDialog({ open, onOpenChange, projectId, projectName, isOwner }: ShareDialogProps) {
  const currentUser = useAuthStore(state => state.user);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>('editor');
  const [collaborators, setCollaborators] = useState<ProjectPermission[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      void loadCollaborators();
      void loadShareLinks();
    }
  }, [open, projectId]);

  const loadCollaborators = async () => {
    try {
      const data = await collaborationApi.getCollaborators(projectId);
      setCollaborators(data);
    } catch (error) {
      console.error('failed to load collaborators:', error);
    }
  };

  const loadShareLinks = async () => {
    if (!isOwner) return;
    try {
      const data = await collaborationApi.getShareLinks(projectId);
      setShareLinks(data);
    } catch (error) {
      console.error('failed to load share links:', error);
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!isOwner) {
      toast.error('Only the owner can invite collaborators');
      return;
    }

    setIsLoading(true);
    try {
      const response = await collaborationApi.inviteCollaborator(projectId, {
        email: email.trim(),
        role: selectedRole,
      });

      if (response.success) {
        toast.success(response.message);
        setEmail('');
        void loadCollaborators();
      } else {
        toast.error(response.message);
      }
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to invite collaborator';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!isOwner) {
      toast.error('Only the owner can remove collaborators');
      return;
    }

    try {
      await collaborationApi.removeCollaborator(projectId, userId);
      toast.success('Collaborator removed');
      void loadCollaborators();
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to remove collaborator';
      toast.error(message);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: CollaboratorRole) => {
    if (!isOwner) {
      toast.error('Only the owner can change roles');
      return;
    }

    if (newRole === 'owner') {
      toast.error('Cannot assign owner role');
      return;
    }

    try {
      await collaborationApi.updateCollaborator(projectId, {
        user_id: userId,
        role: newRole,
      });
      toast.success('Role updated');
      void loadCollaborators();
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to update role';
      toast.error(message);
    }
  };

  const handleGenerateShareLink = async (role: 'editor' | 'viewer') => {
    if (!isOwner) {
      toast.error('Only the owner can generate share links');
      return;
    }

    try {
      const link = await collaborationApi.generateShareLink(projectId, { role });
      toast.success('Share link generated');
      void loadShareLinks();
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to generate share link';
      toast.error(message);
    }
  };

  const handleCopyLink = (link: ShareLink) => {
    const url = `${window.location.origin}/join/${link.token}`;
    void navigator.clipboard.writeText(url);
    setCopiedLink(link.id);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!isOwner) {
      toast.error('Only the owner can revoke share links');
      return;
    }

    try {
      await collaborationApi.revokeShareLink(projectId, linkId);
      toast.success('Share link revoked');
      void loadShareLinks();
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to revoke share link';
      toast.error(message);
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

  const getRoleBadgeVariant = (role: CollaboratorRole) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'outline';
    }
  };

  const editorLink = shareLinks.find(link => link.role === 'editor');
  const viewerLink = shareLinks.find(link => link.role === 'viewer');

  return (
    <DraggableDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Share "${projectName}"`}
      description="Invite collaborators to work on this project together"
      className="max-w-2xl"
    >
      <div className="space-y-6 py-4">
        {/* invite by email */}
        {isOwner && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Invite by email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleInvite()}
                className="flex-1"
              />
              <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as 'editor' | 'viewer')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => void handleInvite()} disabled={isLoading}>
                <Mail className="h-4 w-4 mr-2" />
                Invite
              </Button>
            </div>
          </div>
        )}

        {/* share links */}
        {isOwner && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">Share links</Label>
              
              {/* editor link */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Anyone with this link can edit</span>
                  {!editorLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleGenerateShareLink('editor')}
                    >
                      Generate
                    </Button>
                  )}
                </div>
                {editorLink && (
                  <div className="flex gap-2 items-center p-2 border rounded-md bg-muted/30">
                    <Input
                      readOnly
                      value={`${window.location.origin}/join/${editorLink.token}`}
                      className="flex-1 text-xs bg-transparent border-none"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopyLink(editorLink)}
                    >
                      {copiedLink === editorLink.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => void handleRevokeLink(editorLink.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>

              {/* viewer link */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Anyone with this link can view</span>
                  {!viewerLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleGenerateShareLink('viewer')}
                    >
                      Generate
                    </Button>
                  )}
                </div>
                {viewerLink && (
                  <div className="flex gap-2 items-center p-2 border rounded-md bg-muted/30">
                    <Input
                      readOnly
                      value={`${window.location.origin}/join/${viewerLink.token}`}
                      className="flex-1 text-xs bg-transparent border-none"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopyLink(viewerLink)}
                    >
                      {copiedLink === viewerLink.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => void handleRevokeLink(viewerLink.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* collaborators list */}
        <Separator />
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            People with access ({collaborators.length})
          </Label>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {collaborators.map((collaborator) => {
              const isCurrentUser = collaborator.user_id === currentUser?.id;
              const isCollabOwner = collaborator.role === 'owner';

              return (
                <div
                  key={collaborator.user_id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={collaborator.profile_url} />
                      <AvatarFallback>
                        {getInitials(collaborator.first_name, collaborator.last_name, collaborator.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {collaborator.first_name && collaborator.last_name
                            ? `${collaborator.first_name} ${collaborator.last_name}`
                            : collaborator.email}
                        </p>
                        {isCurrentUser && (
                          <span className="text-xs text-muted-foreground">(you)</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{collaborator.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner && !isCollabOwner ? (
                      <Select
                        value={collaborator.role}
                        onValueChange={(val) => void handleUpdateRole(collaborator.user_id, val as CollaboratorRole)}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={getRoleBadgeVariant(collaborator.role)} className="capitalize">
                        {collaborator.role}
                      </Badge>
                    )}

                    {isOwner && !isCollabOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => void handleRemoveCollaborator(collaborator.user_id)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DraggableDialog>
  );
}

