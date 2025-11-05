export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

export interface Collaborator {
    id: string;
    email: string;
    role: CollaboratorRole;
    color: string;
    isOnline: boolean;
    activeCircuitId?: string;
}

export interface CollaboratorAction {
    type: 'gate_drag' | 'gate_drop' | 'simulation_start' | 'simulation_complete';
    collaboratorId: string;
    circuitId: string;
    data?: unknown;
}

export interface ShareSettings {
    linkAccess: 'none' | 'view' | 'edit';
    shareLink?: string;
}

export interface ProjectCollaboration {
    projectId: string;
    collaborators: Collaborator[];
    shareSettings: ShareSettings;
}
