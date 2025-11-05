import { z } from 'zod';

export const emailSchema = z.string().email('Please enter a valid email address');

export function validateEmail(email: string): { valid: boolean; error?: string } {
    const result = emailSchema.safeParse(email);
    return result.success ? { valid: true } : { valid: false, error: result.error.errors[0]?.message };
}

const COLLABORATOR_COLORS = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // green
    '#06b6d4', // cyan
    '#f97316', // orange
    '#6366f1', // indigo
];

export function getCollaboratorColor(index: number): string {
    return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
}

export function getInitials(email: string): string {
    return email.charAt(0).toUpperCase();
}

export function generateShareLink(projectId: string): string {
    return `${window.location.origin}/project/${projectId}`;
}
