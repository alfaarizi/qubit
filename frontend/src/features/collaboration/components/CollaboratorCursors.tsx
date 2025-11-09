import { CollaboratorCursor } from './CollaboratorCursor';
import type { UserPresence } from '@/features/collaboration/types';

interface CollaboratorCursorsProps {
  presence: UserPresence[];
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function CollaboratorCursors({ presence, scrollContainerRef }: CollaboratorCursorsProps) {
  return (
    <>
      {presence.map((p) => (
        <CollaboratorCursor key={p.connectionId} presence={p} scrollContainerRef={scrollContainerRef} />
      ))}
    </>
  );
}
