export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

export interface Collaborator {
  userId: string;
  email: string;
  role: CollaboratorRole;
  firstName?: string;
  lastName?: string;
  profileUrl?: string;
  addedAt: number;
}

export type ShareLinkType = 'edit' | 'view';

export interface ShareLink {
  token: string;
  linkType: ShareLinkType;
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
}

export interface InviteCollaboratorRequest {
  email: string;
  role: CollaboratorRole;
}

export interface UpdateCollaboratorRoleRequest {
  role: CollaboratorRole;
}

export interface GenerateShareLinkRequest {
  linkType: ShareLinkType;
}

export interface ShareLinkResponse {
  url: string;
  token: string;
  linkType: ShareLinkType;
}

// WebSocket collaboration messages
export interface CursorPosition {
  x: number;
  y: number;
}

export interface UserPresence {
  connectionId: string;
  user: {
    email?: string;
    firstName?: string;
    lastName?: string;
    profileUrl?: string;
  };
  cursor?: CursorPosition;
}

export interface GateOperation {
  operation: 'add' | 'move' | 'delete' | 'group' | 'ungroup' | 'update';
  data: any;
}

export interface GateLockInfo {
  gateId: string;
  lockedBy: string;
  timestamp: number;
}