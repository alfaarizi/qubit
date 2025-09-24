export interface HealthResponse {
    status: string;
    message: string;
    dependencies?: Record<string, string>;
}