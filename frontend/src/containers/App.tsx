import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import HealthCheck from '@/components/HealthCheck';

function App() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header Section */}
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader className="text-center space-y-2">
                        <div className="flex items-center justify-center space-x-3">
                            <div className="text-4xl">⚛️</div>
                            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                QubitKit Partitioner
                            </CardTitle>
                        </div>
                        <CardDescription className="text-lg text-slate-600">
                            Visual Quantum Circuit Partitioner
                        </CardDescription>
                        <div className="flex justify-center space-x-2 pt-2">
                            <Badge variant="secondary">React</Badge>
                            <Badge variant="secondary">TypeScript</Badge>
                            <Badge variant="secondary">Tailwind</Badge>
                            <Badge variant="secondary">D3.js</Badge>
                        </div>
                    </CardHeader>
                </Card>

                {/* Status Section */}
                <Card className="shadow-lg bg-white/90 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <span>🔧</span>
                            <span>System Status</span>
                        </CardTitle>
                        <CardDescription>
                            Frontend application is running. Backend connection status below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <HealthCheck />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default App;