import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from 'next-themes';

interface BlochSphereProps {
    stateVector: number[][];
    title?: string;
}

export function BlochSphere({ stateVector, title = 'Bloch Sphere Representation' }: BlochSphereProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const blochCoordinates = useMemo(() => {
        if (!stateVector) {
            return null;
        }

        // Ensure stateVector is an array
        let vectorArray: any[];
        if (Array.isArray(stateVector)) {
            vectorArray = stateVector;
        } else if (typeof stateVector === 'object') {
            vectorArray = Object.values(stateVector);
        } else {
            return null;
        }

        if (vectorArray.length !== 2) {
            return null;
        }

        // For single qubit: |ψ⟩ = α|0⟩ + β|1⟩
        // where α = stateVector[0] and β = stateVector[1]
        let alpha_r: number, alpha_i: number, beta_r: number, beta_i: number;

        // Handle array format [[real1, imag1], [real2, imag2]]
        if (Array.isArray(vectorArray[0])) {
            [alpha_r, alpha_i] = vectorArray[0];
            [beta_r, beta_i] = vectorArray[1];
        } else if (typeof vectorArray[0] === 'object') {
            // Handle object format
            const alpha = Object.values(vectorArray[0]) as number[];
            const beta = Object.values(vectorArray[1]) as number[];
            [alpha_r, alpha_i] = alpha;
            [beta_r, beta_i] = beta;
        } else {
            return null;
        }

        // Calculate Bloch vector components using Pauli matrices expectation values
        // x = 2 * Re(α* β)
        // y = 2 * Im(α* β)
        // z = |α|² - |β|²
        const x = 2 * (alpha_r * beta_r + alpha_i * beta_i);
        const y = 2 * (alpha_r * beta_i - alpha_i * beta_r);
        const z = (alpha_r * alpha_r + alpha_i * alpha_i) - (beta_r * beta_r + beta_i * beta_i);

        // Calculate spherical coordinates for display
        const r = Math.sqrt(x * x + y * y + z * z);
        const theta = Math.acos(z / (r || 1)) * (180 / Math.PI);
        const phi = Math.atan2(y, x) * (180 / Math.PI);

        return { x, y, z, r, theta, phi };
    }, [stateVector]);

    const data = useMemo(() => {
        if (!blochCoordinates) {
            return [];
        }

        const { x, y, z } = blochCoordinates;

        // Create sphere surface
        const u = Array.from({ length: 30 }, (_, i) => (i / 29) * 2 * Math.PI);
        const v = Array.from({ length: 30 }, (_, i) => (i / 29) * Math.PI);

        const sphereX = u.map(ui => v.map(vi => Math.sin(vi) * Math.cos(ui)));
        const sphereY = u.map(ui => v.map(vi => Math.sin(vi) * Math.sin(ui)));
        const sphereZ = u.map(() => v.map(vi => Math.cos(vi)));

        return [
            // Bloch sphere surface
            {
                type: 'surface' as const,
                x: sphereX,
                y: sphereY,
                z: sphereZ,
                colorscale: [[0, isDark ? 'rgba(100, 116, 139, 0.1)' : 'rgba(203, 213, 225, 0.2)'],
                           [1, isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(203, 213, 225, 0.3)']],
                showscale: false,
                opacity: 0.3,
                hoverinfo: 'skip' as const,
            },
            // State vector arrow
            {
                type: 'scatter3d' as const,
                mode: 'lines+markers' as const,
                x: [0, x],
                y: [0, y],
                z: [0, z],
                line: {
                    color: '#3b82f6',
                    width: 6,
                },
                marker: {
                    size: [0, 12],
                    color: ['#3b82f6', '#ef4444'],
                    symbol: ['circle', 'diamond'],
                },
                name: 'State Vector',
                hovertemplate: '<b>Bloch Vector</b><br>' +
                    'x: %{x:.3f}<br>' +
                    'y: %{y:.3f}<br>' +
                    'z: %{z:.3f}<br>' +
                    '<extra></extra>',
            },
            // X, Y, Z axes
            {
                type: 'scatter3d' as const,
                mode: 'lines+text' as const,
                x: [-1.2, 1.2],
                y: [0, 0],
                z: [0, 0],
                line: { color: isDark ? '#ef4444' : '#dc2626', width: 2 },
                text: ['', 'X'],
                textposition: 'top center' as const,
                textfont: { color: '#ef4444', size: 14 },
                showlegend: false,
                hoverinfo: 'skip' as const,
            },
            {
                type: 'scatter3d' as const,
                mode: 'lines+text' as const,
                x: [0, 0],
                y: [-1.2, 1.2],
                z: [0, 0],
                line: { color: isDark ? '#10b981' : '#059669', width: 2 },
                text: ['', 'Y'],
                textposition: 'top center' as const,
                textfont: { color: '#10b981', size: 14 },
                showlegend: false,
                hoverinfo: 'skip' as const,
            },
            {
                type: 'scatter3d' as const,
                mode: 'lines+text' as const,
                x: [0, 0],
                y: [0, 0],
                z: [-1.2, 1.2],
                line: { color: isDark ? '#3b82f6' : '#2563eb', width: 2 },
                text: ['|1⟩', '|0⟩'],
                textposition: ['bottom center' as const, 'top center' as const],
                textfont: { color: '#3b82f6', size: 14 },
                showlegend: false,
                hoverinfo: 'skip' as const,
            },
        ];
    }, [blochCoordinates, isDark]);

    const layout = useMemo(() => ({
        title: {
            text: title,
            font: { size: 14, color: isDark ? '#e5e7eb' : '#1f2937' }
        },
        scene: {
            xaxis: {
                range: [-1.3, 1.3],
                showticklabels: false,
                showgrid: true,
                gridcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                zeroline: false,
                title: '',
            },
            yaxis: {
                range: [-1.3, 1.3],
                showticklabels: false,
                showgrid: true,
                gridcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                zeroline: false,
                title: '',
            },
            zaxis: {
                range: [-1.3, 1.3],
                showticklabels: false,
                showgrid: true,
                gridcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                zeroline: false,
                title: '',
            },
            aspectmode: 'cube' as const,
            camera: {
                eye: { x: 1.5, y: 1.5, z: 1.3 }
            },
            bgcolor: 'transparent',
        },
        paper_bgcolor: 'transparent',
        margin: { l: 0, r: 0, t: 40, b: 0 },
        font: { family: 'ui-monospace, monospace' },
        showlegend: false,
    }), [title, isDark]);

    const config = useMemo(() => ({
        responsive: true,
        displayModeBar: false,
        displaylogo: false
    }), []);

    if (!blochCoordinates) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        Bloch sphere requires single-qubit state (2 amplitudes)
                    </div>
                </CardContent>
            </Card>
        );
    }

    const { theta, phi, r } = blochCoordinates;

    return (
        <Card>
            <CardContent className="p-4">
                <Plot
                    data={data}
                    layout={layout}
                    config={config}
                    className="w-full"
                    style={{ width: '100%', height: '500px' }}
                />
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-center">
                    <div>
                        <div className="text-muted-foreground">θ (Polar)</div>
                        <div className="font-mono font-medium">{theta.toFixed(2)}°</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground">φ (Azimuthal)</div>
                        <div className="font-mono font-medium">{phi.toFixed(2)}°</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground">Purity</div>
                        <div className="font-mono font-medium">{r.toFixed(4)}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
