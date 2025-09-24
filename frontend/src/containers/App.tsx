import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import HealthCheck from '@/components/HealthCheck';

function App() {
    return (
        <div className="min-h-screen bg-neutral-800 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-neutral-950"></div>

            <div className="relative z-10 p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <Card className="border-white/15 bg-white/5 backdrop-blur-3xl shadow-2xl shadow-black/40">
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-bold text-white drop-shadow-lg">
                                QubitKit Partitioner
                            </CardTitle>
                            <CardDescription className="text-neutral-300 drop-shadow-md">
                                Visual Quantum Circuit Partitioner
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Status */}
                    <Card className="border-white/15 bg-white/5 backdrop-blur-3xl shadow-2xl shadow-black/40">
                        <CardHeader>
                            <CardTitle className="text-white drop-shadow-lg">System Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <HealthCheck />
                        </CardContent>
                    </Card>
                </div>
            </div>

        </div>
    );
}

export default App;