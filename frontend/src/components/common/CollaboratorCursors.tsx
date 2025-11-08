import { useMemo } from 'react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CollaboratorCursorsProps {
  circuitId: string;
}

export function CollaboratorCursors({ circuitId }: CollaboratorCursorsProps) {
  const currentUser = useAuthStore(state => state.user);
  const onlineCollaborators = useCollaborationStore(state => state.getOnlineCollaborators());

  // filter collaborators on current circuit
  const cursors = useMemo(() => {
    return onlineCollaborators
      .filter(c => 
        c.user_id !== currentUser?.id &&
        c.current_circuit_id === circuitId &&
        c.cursor_position
      )
      .map(c => ({
        userId: c.user_id,
        name: c.first_name && c.last_name
          ? `${c.first_name} ${c.last_name}`
          : c.email,
        color: c.color,
        x: c.cursor_position!.x,
        y: c.cursor_position!.y,
      }));
  }, [onlineCollaborators, currentUser?.id, circuitId]);

  if (cursors.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute transition-all duration-100 ease-out"
          style={{
            left: `${cursor.x}px`,
            top: `${cursor.y}px`,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* cursor pointer */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
            <path
              d="M5.65376 12.3673L8.47526 18.5542C8.82559 19.3169 9.88114 19.3289 10.2486 18.5747L11.4796 16.1119C11.5862 15.8997 11.7739 15.7384 12.0053 15.6621L14.9486 14.6674C15.7336 14.3925 15.7605 13.3105 14.991 12.9956L6.27873 9.48768C5.49559 9.16796 4.70138 9.94058 5.02162 10.7226L5.65376 12.3673Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          {/* name label */}
          <Badge
            className={cn(
              "absolute top-5 left-2 text-white border-0 shadow-lg",
              "pointer-events-none select-none"
            )}
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </Badge>
        </div>
      ))}
    </div>
  );
}

