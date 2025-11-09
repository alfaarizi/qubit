import type { SimulationResults, SerializedGate } from '@/types';
import type { Collaborator, ShareLink, CollaboratorRole } from '@/features/collaboration/types';

// circuit within a project with gates and simulation results
export interface CircuitInfo {
  id: string;
  name: string;
  numQubits: number;
  gates: SerializedGate[];
  metadata?: Record<string, unknown>;
  results?: SimulationResults;
}

// project containing multiple circuits with persistence timestamps
export interface Project {
  id: string;
  name: string;
  description?: string;
  circuits: CircuitInfo[];
  activeCircuitId: string;
  collaborators: Collaborator[];
  shareLinks: ShareLink[];
  createdAt: number;
  updatedAt: number;
  userRole?: CollaboratorRole;
}

// payload for creating a new project
export interface ProjectCreate {
  name: string;
  description?: string;
  circuits: CircuitInfo[];
  activeCircuitId: string;
}

// payload for updating an existing project
export interface ProjectUpdate {
  name?: string;
  description?: string;
  circuits?: CircuitInfo[];
  activeCircuitId?: string;
}
