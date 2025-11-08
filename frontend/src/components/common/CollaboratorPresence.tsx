import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useAuthStore } from '@/stores/authStore';

export function CollaboratorPresence() {
  const currentUser = useAuthStore(state => state.user);
  const onlineCollaborators = useCollaborationStore(state => state.getOnlineCollaborators());

  // filter out current user
  const otherCollaborators = onlineCollaborators.filter(c => c.user_id !== currentUser?.id);

  if (otherCollaborators.length === 0) {
    return null;
  }

  const getDisplayName = (collab: typeof otherCollaborators[0]) => {
    if (collab.first_name && collab.last_name) {
      return `${collab.first_name} ${collab.last_name}`;
    }
    return collab.email;
  };

  const getInitials = (collab: typeof otherCollaborators[0]) => {
    if (collab.first_name && collab.last_name) {
      return `${collab.first_name[0]}${collab.last_name[0]}`.toUpperCase();
    }
    return collab.email.substring(0, 2).toUpperCase();
  };

  // show max 5 avatars, with overflow indicator
  const displayCollaborators = otherCollaborators.slice(0, 5);
  const overflowCount = otherCollaborators.length - 5;

  return (
    <div className="flex items-center gap-1">
      {displayCollaborators.map((collaborator) => (
        <TooltipProvider key={collaborator.user_id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <Avatar className="h-6 w-6 border-2 cursor-pointer hover:scale-110 transition-transform" style={{ borderColor: collaborator.color }}>
                  <AvatarImage src={collaborator.profile_url} />
                  <AvatarFallback className="text-xs" style={{ backgroundColor: `${collaborator.color}20`, color: collaborator.color }}>
                    {getInitials(collaborator)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background"
                  style={{ backgroundColor: '#10b981' }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{getDisplayName(collaborator)}</p>
              <p className="text-xs text-muted-foreground capitalize">{collaborator.role}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      {overflowCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-border flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                <span className="text-xs font-medium">+{overflowCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{overflowCount} more online</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

