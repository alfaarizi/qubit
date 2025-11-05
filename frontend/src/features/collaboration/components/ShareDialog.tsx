import { useState } from 'react';
import { Copy, Check, X, Mail, Globe, Lock } from 'lucide-react';
import { DraggableDialog } from '@/components/common/DraggableDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { validateEmail, generateShareLink, getInitials } from '@/features/collaboration/utils';
import type { CollaboratorRole } from '@/features/collaboration/types';

interface ShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    currentUserEmail: string;
}

export function ShareDialog({ open, onOpenChange, projectId, currentUserEmail }: ShareDialogProps) {
    const { collaborators, shareSettings, addCollaborator, updateCollaborator, removeCollaborator, setShareSettings } = useCollaborationStore();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<CollaboratorRole>('editor');
    const [copiedLink, setCopiedLink] = useState(false);
    const shareLink = generateShareLink(projectId);
    const currentUser = collaborators.find(c => c.email === currentUserEmail);
    const isOwner = currentUser?.role === 'owner';

    const handleAddCollaborator = () => {
        const validation = validateEmail(email);
        if (!validation.valid) {
            toast.error(validation.error || 'Invalid email address');
            return;
        }
        if (collaborators.some(c => c.email === email)) {
            toast.error('This collaborator has already been added');
            return;
        }
        addCollaborator({
            id: crypto.randomUUID(),
            email,
            role,
            color: '#3b82f6',
            isOnline: false,
        });
        toast.success(`Invited ${email} as ${role}`);
        setEmail('');
        setRole('editor');
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setCopiedLink(true);
            toast.success('Link copied to clipboard');
            setTimeout(() => setCopiedLink(false), 2000);
        } catch {
            toast.error('Failed to copy link');
        }
    };

    const handleRoleChange = (collaboratorId: string, newRole: CollaboratorRole) => {
        updateCollaborator(collaboratorId, { role: newRole });
        toast.success('Role updated successfully');
    };

    const handleRemoveAccess = (collaboratorId: string) => {
        removeCollaborator(collaboratorId);
        toast.success('Access removed');
    };

    const handleLinkAccessChange = (access: 'none' | 'view' | 'edit') => {
        setShareSettings({ ...shareSettings, linkAccess: access, shareLink: access !== 'none' ? shareLink : undefined });
        toast.success(`Link sharing ${access === 'none' ? 'disabled' : 'enabled'}`);
    };

    return (
        <DraggableDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Share Project"
            description="Invite collaborators to work on this project together."
        >
            <div className="space-y-6 py-4">
                {/* Add Collaborator */}
                <div className="space-y-3">
                    <Label htmlFor="invite-email">Invite by email</Label>
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="invite-email"
                                type="email"
                                placeholder="collaborator@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCollaborator()}
                                className="pl-9"
                            />
                        </div>
                        <Select value={role} onValueChange={(v) => setRole(v as CollaboratorRole)}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={handleAddCollaborator} disabled={!email}>
                            Invite
                        </Button>
                    </div>
                </div>

                <Separator />

                {/* Link Sharing */}
                <div className="space-y-3">
                    <Label>Link sharing</Label>
                    <div className="space-y-2">
                        <button
                            onClick={() => handleLinkAccessChange(shareSettings.linkAccess === 'edit' ? 'none' : 'edit')}
                            className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                {shareSettings.linkAccess === 'edit' ? (
                                    <Globe className="h-4 w-4 text-blue-600" />
                                ) : (
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                    <div className="text-sm font-medium">
                                        {shareSettings.linkAccess === 'edit' ? 'Anyone with the link can edit' : 'Enable link sharing to edit'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {shareSettings.linkAccess === 'edit' ? 'People can modify the project' : 'Click to enable'}
                                    </div>
                                </div>
                            </div>
                        </button>
                        <button
                            onClick={() => handleLinkAccessChange(shareSettings.linkAccess === 'view' ? 'none' : 'view')}
                            className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                {shareSettings.linkAccess === 'view' ? (
                                    <Globe className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                    <div className="text-sm font-medium">
                                        {shareSettings.linkAccess === 'view' ? 'Anyone with the link can view' : 'Enable link sharing to view'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {shareSettings.linkAccess === 'view' ? 'People can view but not edit' : 'Click to enable'}
                                    </div>
                                </div>
                            </div>
                        </button>
                        {shareSettings.linkAccess !== 'none' && (
                            <div className="flex gap-2">
                                <Input value={shareLink} readOnly className="flex-1 font-mono text-xs" />
                                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                                    {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {collaborators.length > 0 && (
                    <>
                        <Separator />
                        {/* Collaborators List */}
                        <div className="space-y-3">
                            <Label>People with access</Label>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {collaborators.map((collaborator) => (
                                    <div key={collaborator.id} className="flex items-center justify-between p-3 rounded-lg border">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <Avatar className="h-8 w-8" style={{ backgroundColor: collaborator.color }}>
                                                <AvatarFallback className="text-white text-xs font-semibold" style={{ backgroundColor: collaborator.color }}>
                                                    {getInitials(collaborator.email)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{collaborator.email}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                    {collaborator.isOnline && <span className="inline-block w-2 h-2 rounded-full bg-green-500" />}
                                                    {collaborator.isOnline ? 'Online' : 'Offline'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {collaborator.role === 'owner' ? (
                                                <span className="text-sm text-muted-foreground px-3 py-1.5">Owner</span>
                                            ) : (
                                                <>
                                                    {isOwner && (
                                                        <Select
                                                            value={collaborator.role}
                                                            onValueChange={(v) => handleRoleChange(collaborator.id, v as CollaboratorRole)}
                                                        >
                                                            <SelectTrigger className="w-[100px] h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="editor">Editor</SelectItem>
                                                                <SelectItem value="viewer">Viewer</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                    {!isOwner && (
                                                        <span className="text-sm text-muted-foreground px-3 py-1.5 capitalize">{collaborator.role}</span>
                                                    )}
                                                    {isOwner && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => handleRemoveAccess(collaborator.id)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DraggableDialog>
    );
}
