import { useNavigate } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import HealthCheck from '@/components/common/HealthCheck';

const cardStyle = 'border-white/15 bg-white/5 backdrop-blur-3xl shadow-2xl shadow-black/40';

function HomePage() {
    const navigate = useNavigate();

    const navigateToComposer = () => {
        navigate('/composer');
    };

    return (
        <section className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-950 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <Card className={cardStyle}>
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold text-white drop-shadow-lg">
                            QubitKit Partitioner
                        </CardTitle>
                        <CardDescription className="text-neutral-300 drop-shadow-md">
                            Visual Quantum Circuit Partitioner
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button onClick={navigateToComposer} className="bg-teal-500 hover:bg-teal-600 text-black">
                            Open Partitioner
                        </Button>
                    </CardContent>
                </Card>

                {/* Status */}
                <Card className={cardStyle}>
                    <CardHeader>
                        <CardTitle className="text-white">System Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <HealthCheck />
                    </CardContent>
                </Card>

                {/* Features Overview */}
                <Card className={cardStyle}>
                    <CardHeader>
                        <CardTitle className="text-white">Features</CardTitle>
                        <CardDescription className="text-neutral-300">
                            Explore the capabilities of QubitKit Partitioner
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                {
                                    title: 'Visual Circuit Design',
                                    desc: 'Design quantum circuits with an intuitive visual interface'
                                },
                                {
                                    title: 'Smart Partitioning',
                                    desc: 'Automatically partition circuits for optimal performance'
                                },
                                {
                                    title: 'Real-time Analysis',
                                    desc: 'Get instant feedback on circuit complexity and efficiency'
                                },
                                {
                                    title: 'Export Options',
                                    desc: 'Export your partitioned circuits in various formats'
                                }
                            ].map(({ title, desc }) => (
                                <Card key={title} className="bg-white/5 border border-white/10 p-4">
                                    <CardTitle className="text-white text-lg font-semibold mb-2">{title}</CardTitle>
                                    <CardDescription className="text-neutral-300 text-sm">{desc}</CardDescription>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}

export default HomePage;
