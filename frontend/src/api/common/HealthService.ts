import { axiosInstance } from '@/api/axiosInstance';
import type { HealthResponse } from '@/resources/common/HealthResponse';

export async function healthCheck(): Promise<HealthResponse> {
    const res = await axiosInstance.get<HealthResponse>('/api/v1/health/');
    return res.data;
}