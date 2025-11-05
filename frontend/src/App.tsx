import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Toaster } from "@/components/ui/sonner"

import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { FullScreenSpinner } from '@/components/common/FullScreenSpinner';
import { useJobManager } from '@/hooks/useJobManager';
import '@/i18n/config';

const Home = lazy(() => import('@/pages/HomePage'));
const ProjectList = lazy(() => import('@/pages/ProjectListPage'));
const ProjectWorkspace = lazy(() => import('@/pages/ProjectWorkspace'));
const SignInPage = lazy(() => import('@/pages/SignInPage'));
const SignUpPage = lazy(() => import('@/pages/SignUpPage'));

function AppContent() {
    useJobManager();

    return (
        <>
            <Suspense fallback={<FullScreenSpinner />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/signin" element={<SignInPage />} />
                    <Route path="/signup" element={<SignUpPage />} />
                    <Route path="/project" element={<ProjectList />} />
                    <Route path="/project/:projectId" element={<ProjectWorkspace />} />
                </Routes>
            </Suspense>
        </>
    );
}

function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <AuthProvider>
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
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;