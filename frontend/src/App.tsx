import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from '@/lib/msalConfig';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Toaster } from "@/components/ui/sonner"

import { ThemeProvider } from "@/providers/ThemeProvider";
import { FullScreenSpinner } from '@/components/common/FullScreenSpinner';
import { ProtectedRoute } from '@/components/common/ProtectedRoute.tsx';
import { useJobManager } from '@/hooks/useJobManager';
import '@/i18n/config';

const msalInstance = new PublicClientApplication(msalConfig);

const Home = lazy(() => import('@/pages/HomePage'));
const ProjectList = lazy(() => import('@/pages/ProjectListPage'));
const ProjectWorkspace = lazy(() => import('@/pages/ProjectWorkspace'));
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));

function AppContent() {
    useJobManager();

    return (
        <>
            <Suspense fallback={<FullScreenSpinner />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/register" element={<AuthPage />} />
                    <Route
                        path="/me"
                        element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/project"
                        element={
                            <ProtectedRoute>
                                <ProjectList />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/project/:projectId"
                        element={
                            <ProtectedRoute>
                                <ProjectWorkspace />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Suspense>
        </>
    );
}

function App() {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
    console.log('Google Client ID loaded:', googleClientId ? 'Yes' : 'No', googleClientId.substring(0, 20) + '...');
    return (
        <MsalProvider instance={msalInstance}>
            <GoogleOAuthProvider clientId={googleClientId}>
                <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                    <Router>
                        <AppContent />
                    </Router>
                    <Toaster
                        position="top-center"
                        richColors
                        toastOptions={{
                            classNames: {
                                toast: 'bg-background text-foreground border border-border',
                                description: 'text-muted-foreground',
                                actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
                                cancelButton: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                            },
                        }}
                    />
                    <Analytics />
                    <SpeedInsights/>
                </ThemeProvider>
            </GoogleOAuthProvider>
        </MsalProvider>
    );
}

export default App;
