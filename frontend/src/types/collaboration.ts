// user role in a shared project
export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

// permission level for project access
export interface ProjectPermission {
  user_id: string;
  email: string;
  role: CollaboratorRole;
  first_name?: string;
  last_name?: string;
  profile_url?: string;
}

// project collaborator with real-time presence
export interface Collaborator extends ProjectPermission {
  is_online: boolean;
  last_seen?: number;
  current_circuit_id?: string;
  cursor_position?: { x: number; y: number };
  selected_gate_ids?: string[];
  color: string; // assigned color for cursor/selection highlighting
}

// shareable link with access level
export interface ShareLink {
  id: string;
  project_id: string;
  role: 'editor' | 'viewer';
  token: string;
  expires_at?: number;
  created_at: number;
}

// request to invite user by email
export interface InviteCollaboratorRequest {
  email: string;
  role: 'editor' | 'viewer';
}

// response after inviting collaborator
export interface InviteCollaboratorResponse {
  success: boolean;
  message: string;
  collaborator?: ProjectPermission;
}

// request to update collaborator role
export interface UpdateCollaboratorRequest {
  user_id: string;
  role: CollaboratorRole;
}

// request to generate shareable link
export interface GenerateShareLinkRequest {
  role: 'editor' | 'viewer';
  expires_in_days?: number;
}

// real-time collaboration event types
export type CollaborationEventType =
  | 'user_joined'
  | 'user_left'
  | 'cursor_move'
  | 'gate_selected'
  | 'gate_added'
  | 'gate_moved'
  | 'gate_deleted'
  | 'gate_updated'
  | 'gate_grouped'
  | 'gate_ungrouped'
  | 'circuit_added'
  | 'circuit_removed'
  | 'circuit_renamed'
  | 'circuit_switched'
  | 'execution_started'
  | 'execution_progress'
  | 'execution_completed'
  | 'project_renamed'
  | 'gate_locked'
  | 'gate_unlocked';

// base collaboration event
export interface CollaborationEvent {
  type: CollaborationEventType;
  user_id: string;
  user_name: string;
  user_color: string;
  project_id: string;
  timestamp: number;
}

// cursor movement event
export interface CursorMoveEvent extends CollaborationEvent {
  type: 'cursor_move';
  x: number;
  y: number;
  circuit_id: string;
}

// gate selection event
export interface GateSelectedEvent extends CollaborationEvent {
  type: 'gate_selected';
  gate_ids: string[];
  circuit_id: string;
}

// gate operation events
export interface GateOperationEvent extends CollaborationEvent {
  type: 'gate_added' | 'gate_moved' | 'gate_deleted' | 'gate_updated';
  gate_id: string;
  circuit_id: string;
  gate_data?: any;
}

// gate grouping events
export interface GateGroupEvent extends CollaborationEvent {
  type: 'gate_grouped' | 'gate_ungrouped';
  gate_ids: string[];
  circuit_id: string;
  group_id?: string;
}

// circuit events
export interface CircuitEvent extends CollaborationEvent {
  type: 'circuit_added' | 'circuit_removed' | 'circuit_renamed' | 'circuit_switched';
  circuit_id: string;
  circuit_name?: string;
}

// execution events
export interface ExecutionEvent extends CollaborationEvent {
  type: 'execution_started' | 'execution_progress' | 'execution_completed';
  circuit_id: string;
  progress?: number;
  status?: string;
}

// project rename event
export interface ProjectRenamedEvent extends CollaborationEvent {
  type: 'project_renamed';
  project_name: string;
}

// user presence event
export interface UserPresenceEvent extends CollaborationEvent {
  type: 'user_joined' | 'user_left';
  circuit_id?: string;
}

// gate locking events
export interface GateLockEvent extends CollaborationEvent {
  type: 'gate_locked' | 'gate_unlocked';
  gate_id: string;
  circuit_id: string;
}

// union type for all collaboration events
export type AnyCollaborationEvent =
  | CursorMoveEvent
  | GateSelectedEvent
  | GateOperationEvent
  | GateGroupEvent
  | CircuitEvent
  | ExecutionEvent
  | ProjectRenamedEvent
  | UserPresenceEvent
  | GateLockEvent;

// websocket message for collaboration
export interface CollaborationMessage {
  type: 'collaboration_event';
  project_id: string;
  event: AnyCollaborationEvent;
}

// user colors for cursor/selection highlighting
export const COLLABORATOR_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // purple
];

