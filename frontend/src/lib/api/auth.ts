import { api } from './client';
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UserResponse,
  OAuthLoginRequest,
  EmailVerificationRequest,
  EmailVerificationVerify,
} from '@/types';

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', data);
    return response.data;
  },
  register: async (data: RegisterRequest): Promise<UserResponse> => {
    const response = await api.post<UserResponse>('/auth/register', data);
    return response.data;
  },
  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },
  me: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>('/auth/me');
    return response.data;
  },
  oauthLogin: async (data: OAuthLoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/oauth/login', data);
    return response.data;
  },
  sendEmailCode: async (data: EmailVerificationRequest): Promise<void> => {
    await api.post('/auth/email/send-code', data);
  },
  verifyEmailCode: async (data: EmailVerificationVerify): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/email/verify', data);
    return response.data;
  },
};
