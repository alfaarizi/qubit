import { createClient } from '@supabase/supabase-js';

// For development, we'll use local storage-based auth
// In production, replace these with your Supabase project credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});

// Mock auth for development (remove in production)
const MOCK_AUTH_ENABLED = !import.meta.env.VITE_SUPABASE_URL;

interface MockUser {
    id: string;
    email: string;
    created_at: string;
}

interface MockAuthResponse {
    user: MockUser | null;
    error: Error | null;
}

// Simple localStorage-based mock auth for development
export const mockAuth = {
    async signUp(email: string, password: string): Promise<MockAuthResponse> {
        if (!MOCK_AUTH_ENABLED) return { user: null, error: new Error('Mock auth disabled') };

        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const existingUser = users.find((u: MockUser) => u.email === email);

        if (existingUser) {
            return { user: null, error: new Error('User already exists') };
        }

        const user: MockUser = {
            id: crypto.randomUUID(),
            email,
            created_at: new Date().toISOString(),
        };

        users.push(user);
        localStorage.setItem('mock_users', JSON.stringify(users));
        localStorage.setItem('mock_session', JSON.stringify({ user }));

        return { user, error: null };
    },

    async signIn(email: string, password: string): Promise<MockAuthResponse> {
        if (!MOCK_AUTH_ENABLED) return { user: null, error: new Error('Mock auth disabled') };

        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const user = users.find((u: MockUser) => u.email === email);

        if (!user) {
            return { user: null, error: new Error('Invalid credentials') };
        }

        localStorage.setItem('mock_session', JSON.stringify({ user }));
        return { user, error: null };
    },

    async signOut(): Promise<{ error: Error | null }> {
        if (!MOCK_AUTH_ENABLED) return { error: new Error('Mock auth disabled') };

        localStorage.removeItem('mock_session');
        return { error: null };
    },

    getSession(): { user: MockUser | null } {
        if (!MOCK_AUTH_ENABLED) return { user: null };

        const session = localStorage.getItem('mock_session');
        if (!session) return { user: null };

        try {
            return JSON.parse(session);
        } catch {
            return { user: null };
        }
    },
};

export const isMockAuthEnabled = MOCK_AUTH_ENABLED;
