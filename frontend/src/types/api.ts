// login credentials
export interface LoginRequest {
  email: string;
  password: string;
}

// registration payload with optional user details
export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

// JWT authentication tokens
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// authenticated user profile data
export interface UserResponse {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  oauth_provider?: string;
  profile_url?: string;
}

// OAuth login payload with provider token
export interface OAuthLoginRequest {
  token: string;
  provider: 'google' | 'microsoft';
}

// email verification request
export interface EmailVerificationRequest {
  email: string;
}

// email verification code confirmation
export interface EmailVerificationVerify {
  email: string;
  code: string;
}

// response for circuit partition job creation
export interface PartitionResponse {
  job_id: string;
  status: string;
  message: string;
}

// response for QASM import job creation
export interface ImportQasmResponse {
  job_id: string;
  status: string;
}

// incremental update from a running job
export interface JobUpdate {
  type: 'phase' | 'log' | 'complete' | 'error';
  phase?: string;
  message?: string;
  progress?: number;
  result?: Record<string, unknown>;
  timestamp?: number;
}

// client-side job tracking state
export interface Job {
  jobId: string;
  circuitId: string;
  jobType: 'partition' | 'import';
  status: 'pending' | 'running' | 'complete' | 'error';
  updates: JobUpdate[];
  error: string | null;
  createdAt: number;
  toastId?: string | number;
}
