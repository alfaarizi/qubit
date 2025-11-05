import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, mockAuth, isMockAuthEnabled } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        const initAuth = async () => {
            if (isMockAuthEnabled) {
                const { user: mockUser } = mockAuth.getSession();
                setUser(mockUser as unknown as User);
                setLoading(false);
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ?? null);
                setLoading(false);

                // Listen for changes on auth state
                const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                    setUser(session?.user ?? null);
                });

                return () => subscription.unsubscribe();
            }
        };

        initAuth();
    }, []);

    const signIn = async (email: string, password: string) => {
        if (isMockAuthEnabled) {
            const { user: mockUser, error } = await mockAuth.signIn(email, password);
            if (!error && mockUser) {
                setUser(mockUser as unknown as User);
            }
            return { error };
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data.user) {
            setUser(data.user);
        }
        return { error: error as Error | null };
    };

    const signUp = async (email: string, password: string) => {
        if (isMockAuthEnabled) {
            const { user: mockUser, error } = await mockAuth.signUp(email, password);
            if (!error && mockUser) {
                setUser(mockUser as unknown as User);
            }
            return { error };
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (!error && data.user) {
            setUser(data.user);
        }
        return { error: error as Error | null };
    };

    const signOut = async () => {
        if (isMockAuthEnabled) {
            await mockAuth.signOut();
            setUser(null);
        } else {
            await supabase.auth.signOut();
            setUser(null);
        }
    };

    const value = {
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
