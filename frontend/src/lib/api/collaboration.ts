import { api } from '@/lib/api/client';
import type {
  InviteCollaboratorRequest,
  UpdateCollaboratorRoleRequest,
  GenerateShareLinkRequest,
  ShareLinkResponse,
} from '@/features/collaboration/types';
import type { Project } from '@/types/project';

export const collaborationApi = {
  inviteCollaborator: async (projectId: string, request: InviteCollaboratorRequest): Promise<Project> => {
    const response = await api.post<Project>(`/collaboration/${projectId}/collaborators`, request);
    return response.data;
  },
  updateCollaboratorRole: async (
    projectId: string,
    collaboratorEmail: string,
    request: UpdateCollaboratorRoleRequest
  ): Promise<Project> => {
    const response = await api.put<Project>(
      `/collaboration/${projectId}/collaborators/${encodeURIComponent(collaboratorEmail)}`,
      request
    );
    return response.data;
  },
  removeCollaborator: async (projectId: string, collaboratorEmail: string): Promise<Project> => {
    const response = await api.delete<Project>(
      `/collaboration/${projectId}/collaborators/${encodeURIComponent(collaboratorEmail)}`
    );
    return response.data;
  },
  generateShareLink: async (projectId: string, request: GenerateShareLinkRequest): Promise<ShareLinkResponse> => {
    const response = await api.post<ShareLinkResponse>(
      `/collaboration/${projectId}/share-links`,
      request
    );
    return response.data;
  },
  revokeShareLink: async (projectId: string, token: string): Promise<void> => {
    await api.delete(`/collaboration/${projectId}/share-links/${token}`);
  },
  joinViaShareLink: async (shareToken: string, projectId: string): Promise<Project> => {
    const response = await api.get<Project>('/collaboration/join', {
      params: { share_token: shareToken, project_id: projectId },
    });
    return response.data;
  },
};

