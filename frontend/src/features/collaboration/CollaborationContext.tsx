import { createContext, useContext, type ReactNode } from 'react';
import { useCollaboration } from './hooks/useCollaboration';
import type { UserPresence, GateLockInfo } from './types';

interface CollaborationContextValue {
  presence: UserPresence[];
  gateLocks: GateLockInfo[];
  connectionId?: string;
  isConnected: boolean;
  updateCursor: (position: { x: number; y: number }) => void;
  broadcastGateOperation: (operation: string, data: Record<string, unknown>) => void;
  lockGate: (gateId: string) => Promise<boolean>;
  unlockGate: (gateId: string) => void;
  updateSelection: (selectedGates: string[]) => void;
  isGateLocked: (gateId: string) => boolean;
  isGateLockedByMe: (gateId: string) => boolean;
}

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

interface CollaborationProviderProps {
  children: ReactNode;
  projectId: string;
  enabled?: boolean;
}

export function CollaborationProvider({ children, projectId, enabled = true }: CollaborationProviderProps) {
  const collaboration = useCollaboration({ projectId, enabled });
  return (
    <CollaborationContext.Provider value={collaboration}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaborationContext() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaborationContext must be used within CollaborationProvider');
  }
  return context;
}

export function useOptionalCollaborationContext() {
  return useContext(CollaborationContext);
}