import HealthCheck from './components/HealthCheck';

function App() {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">QubitKit</h1>
                    <p className="text-gray-600">React + TypeScript + Tailwind + D3.js</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-3">Status</h2>
                    <p className="text-gray-600">Frontend is running. Backend connection status below.</p>
                </div>
                <HealthCheck />
            </div>
        </div>
    );
}

export default App;