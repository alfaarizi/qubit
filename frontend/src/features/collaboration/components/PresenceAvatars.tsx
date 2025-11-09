import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { UserPresence } from '@/features/collaboration/types';

interface PresenceAvatarsProps {
  presence: UserPresence[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

const getInitials = (user: UserPresence['user']): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.email) {
    return user.email.substring(0, 2).toUpperCase();
  }
  return 'U';
};

const getUserName = (user: UserPresence['user']): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.email) {
    return user.email;
  }
  return 'Unknown User';
};

const getColorForUser = (connectionId: string): string => {
  // generate consistent color based on connection ID
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
  ];
  
  const hash = connectionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export function PresenceAvatars({ presence, maxVisible = 5, size = 'sm' }: PresenceAvatarsProps) {
  const visible = presence.slice(0, maxVisible);
  const overflow = presence.length - maxVisible;
  if (presence.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((p) => (
        <TooltipProvider key={p.connectionId}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <Avatar className={`${sizeClasses[size]} border-2 border-background ring-2 ring-green-500`}>
                  <AvatarImage src={p.user.profileUrl} />
                  <AvatarFallback className={`${getColorForUser(p.connectionId)} text-white`}>
                    {getInitials(p.user)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-background" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{getUserName(p.user)}</p>
              <p className="text-xs text-muted-foreground">Active now</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      {overflow > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className={`${sizeClasses[size]} border-2 border-background`}>
                <AvatarFallback className="bg-muted text-muted-foreground">
                  +{overflow}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{overflow} more {overflow === 1 ? 'user' : 'users'} online</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

