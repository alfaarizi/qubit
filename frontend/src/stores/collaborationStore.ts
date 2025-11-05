import { create } from 'zustand';
import type { Collaborator, ShareSettings, CollaboratorAction } from '@/features/collaboration/types';

interface CollaborationState {
    collaborators: Collaborator[];
    shareSettings: ShareSettings;
    recentActions: CollaboratorAction[];
    setCollaborators: (collaborators: Collaborator[]) => void;
    addCollaborator: (collaborator: Collaborator) => void;
    updateCollaborator: (id: string, updates: Partial<Collaborator>) => void;
    removeCollaborator: (id: string) => void;
    setShareSettings: (settings: ShareSettings) => void;
    addAction: (action: CollaboratorAction) => void;
    clearActions: () => void;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
    collaborators: [],
    shareSettings: { linkAccess: 'none' },
    recentActions: [],
    setCollaborators: (collaborators) => set({ collaborators }),
    addCollaborator: (collaborator) => set((state) => ({
        collaborators: [...state.collaborators, collaborator],
    })),
    updateCollaborator: (id, updates) => set((state) => ({
        collaborators: state.collaborators.map((c) =>
            c.id === id ? { ...c, ...updates } : c
        ),
    })),
    removeCollaborator: (id) => set((state) => ({
        collaborators: state.collaborators.filter((c) => c.id !== id),
    })),
    setShareSettings: (settings) => set({ shareSettings: settings }),
    addAction: (action) => set((state) => ({
        recentActions: [...state.recentActions.slice(-99), action],
    })),
    clearActions: () => set({ recentActions: [] }),
}));
