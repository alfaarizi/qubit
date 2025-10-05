import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

import { ThemeProvider } from "@/providers/ThemeProvider";
import { FullScreenSpinner } from '@/components/common/FullScreenSpinner';

const Home = lazy(() => import('@/pages/HomePage'));
const Workspace = lazy(() => import('@/pages/WorkspacePage'));

function App() {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <Router>
                <Suspense fallback={<FullScreenSpinner />}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/workspace" element={<Workspace />} />
                    </Routes>
                </Suspense>
            </Router>
            <Analytics />
            <SpeedInsights/>
        </ThemeProvider>
    );
}

export default App;