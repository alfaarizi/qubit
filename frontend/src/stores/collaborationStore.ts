import { create } from 'zustand';
import type {
  Collaborator,
  CollaboratorRole,
  ProjectPermission,
  COLLABORATOR_COLORS,
} from '@/types/collaboration';
import { COLLABORATOR_COLORS as COLORS } from '@/types/collaboration';

interface CollaborationState {
  // current project collaboration data
  projectId: string | null;
  myRole: CollaboratorRole | null;
  collaborators: Map<string, Collaborator>;
  
  // locked gates (being edited by others)
  lockedGates: Map<string, { userId: string; userName: string; color: string }>;
  
  // initialization
  initializeCollaboration: (projectId: string, myRole: CollaboratorRole, collaborators: ProjectPermission[]) => void;
  clearCollaboration: () => void;
  
  // collaborator management
  addCollaborator: (collaborator: ProjectPermission, isOnline?: boolean) => void;
  removeCollaborator: (userId: string) => void;
  updateCollaboratorPresence: (userId: string, isOnline: boolean) => void;
  updateCollaboratorCursor: (userId: string, x: number, y: number, circuitId: string) => void;
  updateCollaboratorSelection: (userId: string, gateIds: string[], circuitId: string) => void;
  updateCollaboratorCircuit: (userId: string, circuitId: string) => void;
  
  // gate locking
  lockGate: (gateId: string, userId: string, userName: string, color: string) => void;
  unlockGate: (gateId: string) => void;
  isGateLocked: (gateId: string) => boolean;
  getGateLock: (gateId: string) => { userId: string; userName: string; color: string } | undefined;
  
  // permission checks
  canEdit: () => boolean;
  isOwner: () => boolean;
  
  // getters
  getOnlineCollaborators: () => Collaborator[];
  getCollaborator: (userId: string) => Collaborator | undefined;
}

// assign color to collaborator based on their user id
const assignColor = (userId: string, existingColors: Set<string>): string => {
  const availableColors = COLORS.filter(color => !existingColors.has(color));
  if (availableColors.length > 0) {
    return availableColors[0];
  }
  // if all colors taken, use hash of userId
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
};

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  projectId: null,
  myRole: null,
  collaborators: new Map(),
  lockedGates: new Map(),

  initializeCollaboration: (projectId, myRole, collaborators) => {
    const existingColors = new Set<string>();
    const collaboratorMap = new Map<string, Collaborator>();
    
    collaborators.forEach(collab => {
      const color = assignColor(collab.user_id, existingColors);
      existingColors.add(color);
      
      collaboratorMap.set(collab.user_id, {
        ...collab,
        is_online: false,
        color,
      });
    });
    
    set({
      projectId,
      myRole,
      collaborators: collaboratorMap,
      lockedGates: new Map(),
    });
  },

  clearCollaboration: () => {
    set({
      projectId: null,
      myRole: null,
      collaborators: new Map(),
      lockedGates: new Map(),
    });
  },

  addCollaborator: (collaborator, isOnline = false) => {
    const { collaborators } = get();
    const existingColors = new Set(Array.from(collaborators.values()).map(c => c.color));
    const color = assignColor(collaborator.user_id, existingColors);
    
    const newCollaborators = new Map(collaborators);
    newCollaborators.set(collaborator.user_id, {
      ...collaborator,
      is_online: isOnline,
      color,
    });
    
    set({ collaborators: newCollaborators });
  },

  removeCollaborator: (userId) => {
    const { collaborators, lockedGates } = get();
    const newCollaborators = new Map(collaborators);
    newCollaborators.delete(userId);
    
    // unlock any gates locked by this user
    const newLockedGates = new Map(lockedGates);
    Array.from(newLockedGates.entries()).forEach(([gateId, lock]) => {
      if (lock.userId === userId) {
        newLockedGates.delete(gateId);
      }
    });
    
    set({ collaborators: newCollaborators, lockedGates: newLockedGates });
  },

  updateCollaboratorPresence: (userId, isOnline) => {
    const { collaborators } = get();
    const collaborator = collaborators.get(userId);
    if (!collaborator) return;
    
    const newCollaborators = new Map(collaborators);
    newCollaborators.set(userId, {
      ...collaborator,
      is_online: isOnline,
      last_seen: isOnline ? undefined : Date.now(),
    });
    
    set({ collaborators: newCollaborators });
  },

  updateCollaboratorCursor: (userId, x, y, circuitId) => {
    const { collaborators } = get();
    const collaborator = collaborators.get(userId);
    if (!collaborator) return;
    
    const newCollaborators = new Map(collaborators);
    newCollaborators.set(userId, {
      ...collaborator,
      cursor_position: { x, y },
      current_circuit_id: circuitId,
    });
    
    set({ collaborators: newCollaborators });
  },

  updateCollaboratorSelection: (userId, gateIds, circuitId) => {
    const { collaborators } = get();
    const collaborator = collaborators.get(userId);
    if (!collaborator) return;
    
    const newCollaborators = new Map(collaborators);
    newCollaborators.set(userId, {
      ...collaborator,
      selected_gate_ids: gateIds,
      current_circuit_id: circuitId,
    });
    
    set({ collaborators: newCollaborators });
  },

  updateCollaboratorCircuit: (userId, circuitId) => {
    const { collaborators } = get();
    const collaborator = collaborators.get(userId);
    if (!collaborator) return;
    
    const newCollaborators = new Map(collaborators);
    newCollaborators.set(userId, {
      ...collaborator,
      current_circuit_id: circuitId,
    });
    
    set({ collaborators: newCollaborators });
  },

  lockGate: (gateId, userId, userName, color) => {
    const { lockedGates } = get();
    const newLockedGates = new Map(lockedGates);
    newLockedGates.set(gateId, { userId, userName, color });
    set({ lockedGates: newLockedGates });
  },

  unlockGate: (gateId) => {
    const { lockedGates } = get();
    const newLockedGates = new Map(lockedGates);
    newLockedGates.delete(gateId);
    set({ lockedGates: newLockedGates });
  },

  isGateLocked: (gateId) => {
    return get().lockedGates.has(gateId);
  },

  getGateLock: (gateId) => {
    return get().lockedGates.get(gateId);
  },

  canEdit: () => {
    const { myRole } = get();
    return myRole === 'owner' || myRole === 'editor';
  },

  isOwner: () => {
    const { myRole } = get();
    return myRole === 'owner';
  },

  getOnlineCollaborators: () => {
    const { collaborators } = get();
    return Array.from(collaborators.values()).filter(c => c.is_online);
  },

  getCollaborator: (userId) => {
    return get().collaborators.get(userId);
  },
}));

