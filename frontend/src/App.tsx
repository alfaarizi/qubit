import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Toaster } from "@/components/ui/sonner"

import { ThemeProvider } from "@/providers/ThemeProvider";
import { FullScreenSpinner } from '@/components/common/FullScreenSpinner';

const Home = lazy(() => import('@/pages/HomePage'));
const Composer = lazy(() => import('@/pages/ComposerPage'));

function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <Router>
                <Suspense fallback={<FullScreenSpinner />}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/composer" element={<Composer />} />
                    </Routes>
                </Suspense>
            </Router>
            <Toaster position="top-center" />
            <Analytics />
            <SpeedInsights/>
        </ThemeProvider>
    );
}

export default App;