import { api } from './client';
import type {
  ProjectPermission,
  ShareLink,
  InviteCollaboratorRequest,
  InviteCollaboratorResponse,
  UpdateCollaboratorRequest,
  GenerateShareLinkRequest,
} from '@/types/collaboration';

export const collaborationApi = {
  // get all collaborators for a project
  getCollaborators: async (projectId: string): Promise<ProjectPermission[]> => {
    const response = await api.get<ProjectPermission[]>(`/projects/${projectId}/collaborators`);
    return response.data;
  },

  // invite user to project by email
  inviteCollaborator: async (
    projectId: string,
    data: InviteCollaboratorRequest
  ): Promise<InviteCollaboratorResponse> => {
    const response = await api.post<InviteCollaboratorResponse>(
      `/projects/${projectId}/collaborators/invite`,
      data
    );
    return response.data;
  },

  // update collaborator's role
  updateCollaborator: async (
    projectId: string,
    data: UpdateCollaboratorRequest
  ): Promise<ProjectPermission> => {
    const response = await api.put<ProjectPermission>(
      `/projects/${projectId}/collaborators/${data.user_id}`,
      { role: data.role }
    );
    return response.data;
  },

  // remove collaborator from project
  removeCollaborator: async (projectId: string, userId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/collaborators/${userId}`);
  },

  // generate shareable link
  generateShareLink: async (
    projectId: string,
    data: GenerateShareLinkRequest
  ): Promise<ShareLink> => {
    const response = await api.post<ShareLink>(
      `/projects/${projectId}/share-links`,
      data
    );
    return response.data;
  },

  // get all share links for project
  getShareLinks: async (projectId: string): Promise<ShareLink[]> => {
    const response = await api.get<ShareLink[]>(`/projects/${projectId}/share-links`);
    return response.data;
  },

  // revoke share link
  revokeShareLink: async (projectId: string, linkId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/share-links/${linkId}`);
  },

  // join project via share link token
  joinViaShareLink: async (token: string): Promise<{ project_id: string }> => {
    const response = await api.post<{ project_id: string }>('/projects/join', { token });
    return response.data;
  },

  // get user's role in project
  getMyRole: async (projectId: string): Promise<{ role: string }> => {
    const response = await api.get<{ role: string }>(`/projects/${projectId}/my-role`);
    return response.data;
  },
};

