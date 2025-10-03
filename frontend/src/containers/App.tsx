import { Analytics } from "@vercel/analytics/react"
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FullScreenSpinner } from '@/components/FullScreenSpinner/FullScreenSpinner';
import { ThemeProvider } from "@/components/ThemeProvider";

const Home = lazy(() => import('@/pages/Home'));
const Workspace = lazy(() => import('@/pages/Workspace'));

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
        </ThemeProvider>
    );
}

export default App;