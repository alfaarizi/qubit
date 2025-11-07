import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Toaster } from "@/components/ui/sonner"

import { ThemeProvider } from "@/providers/ThemeProvider";
import { FullScreenSpinner } from '@/components/common/FullScreenSpinner';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useJobManager } from '@/hooks/useJobManager';
import '@/i18n/config';

const Home = lazy(() => import('@/pages/HomePage'));
const ProjectList = lazy(() => import('@/pages/ProjectListPage'));
const ProjectWorkspace = lazy(() => import('@/pages/ProjectWorkspace'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));

function AppContent() {
    useJobManager();

    return (
        <>
            <Suspense fallback={<FullScreenSpinner />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
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
    return (
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
    );
}

export default App;
