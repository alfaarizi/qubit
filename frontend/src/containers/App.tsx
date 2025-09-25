import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FullScreenSpinner } from '@/components/FullScreenSpinner/FullScreenSpinner';

const Home = lazy(() => import('@/pages/Home'));
const Workspace = lazy(() => import('@/pages/Workspace'));

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-950 relative overflow-hidden">
                <div className="relative z-10 p-6">
                    <Suspense fallback={<FullScreenSpinner />}>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/workspace" element={<Workspace />} />
                        </Routes>
                    </Suspense>
                </div>
            </div>
        </Router>
    );
}

export default App;