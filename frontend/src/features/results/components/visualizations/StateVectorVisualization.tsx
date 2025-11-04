import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from 'next-themes';

interface StateVectorVisualizationProps {
    stateVector: number[][];
    title: string;
    maxAmplitudes?: number;
}

export function StateVectorVisualization({
    stateVector,
    title,
    maxAmplitudes = 32
}: StateVectorVisualizationProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const data = useMemo(() => {
        if (!stateVector) {
            return [];
        }

        // Ensure stateVector is an array
        let vectorArray: number[][];
        if (Array.isArray(stateVector)) {
            vectorArray = stateVector;
        } else if (typeof stateVector === 'object') {
            // If it's an object, try to convert to array
            console.warn('[StateVectorVisualization] stateVector is not an array, attempting conversion:', stateVector);
            vectorArray = Object.values(stateVector);
        } else {
            console.error('[StateVectorVisualization] Invalid stateVector format:', stateVector);
            return [];
        }

        if (vectorArray.length === 0) {
            return [];
        }

        // State vector format: [[real1, imag1], [real2, imag2], ...]
        const amplitudes = vectorArray.map((item, idx) => {
            let real: number, imag: number;

            if (Array.isArray(item) && item.length === 2) {
                [real, imag] = item;
            } else if (typeof item === 'object' && item !== null) {
                // Handle object format like {0: real, 1: imag}
                const values = Object.values(item);
                if (values.length >= 2) {
                    [real, imag] = values as [number, number];
                } else {
                    console.warn(`[StateVectorVisualization] Invalid amplitude at index ${idx}:`, item);
                    real = 0;
                    imag = 0;
                }
            } else {
                console.warn(`[StateVectorVisualization] Invalid amplitude format at index ${idx}:`, item);
                real = 0;
                imag = 0;
            }

            const magnitude = Math.sqrt(real * real + imag * imag);
            const phase = Math.atan2(imag, real);
            return { magnitude, phase, real, imag };
        });

        // Show top N amplitudes by magnitude
        const indices = amplitudes
            .map((amp, idx) => ({ amp, idx }))
            .sort((a, b) => b.amp.magnitude - a.amp.magnitude)
            .slice(0, maxAmplitudes)
            .sort((a, b) => a.idx - b.idx);

        const numQubits = Math.ceil(Math.log2(vectorArray.length));
        const labels = indices.map(({ idx }) =>
            `|${idx.toString(2).padStart(numQubits, '0')}⟩`
        );

        return [
            {
                type: 'bar' as const,
                name: 'Magnitude',
                x: labels,
                y: indices.map(({ amp }) => amp.magnitude),
                marker: {
                    color: indices.map(({ amp }) => amp.phase),
                    colorscale: [
                        [0, '#3b82f6'],
                        [0.5, '#a78bfa'],
                        [1, '#ec4899']
                    ],
                    colorbar: {
                        title: 'Phase (rad)',
                        titleside: 'right',
                        tickfont: { color: isDark ? '#9ca3af' : '#6b7280' },
                        titlefont: { color: isDark ? '#9ca3af' : '#6b7280' }
                    },
                    cmin: -Math.PI,
                    cmax: Math.PI,
                },
                hovertemplate: '<b>State</b>: %{x}<br>' +
                    '<b>Magnitude</b>: %{y:.4f}<br>' +
                    '<b>Real</b>: %{customdata[0]:.4f}<br>' +
                    '<b>Imag</b>: %{customdata[1]:.4f}<br>' +
                    '<b>Phase</b>: %{customdata[2]:.4f} rad<br>' +
                    '<extra></extra>',
                customdata: indices.map(({ amp }) => [amp.real, amp.imag, amp.phase]),
            }
        ];
    }, [stateVector, maxAmplitudes, isDark]);

    const layout = useMemo(() => ({
        title: {
            text: title,
            font: { size: 14, color: isDark ? '#e5e7eb' : '#1f2937' }
        },
        xaxis: {
            title: 'Quantum State',
            tickangle: -45,
            color: isDark ? '#9ca3af' : '#6b7280',
            gridcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        yaxis: {
            title: 'Amplitude Magnitude |ψ|',
            color: isDark ? '#9ca3af' : '#6b7280',
            gridcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { l: 60, r: 80, t: 40, b: 80 },
        hovermode: 'closest' as const,
        font: { family: 'ui-monospace, monospace' }
    }), [title, isDark]);

    const config = useMemo(() => ({
        responsive: true,
        displayModeBar: false,
        displaylogo: false
    }), []);

    if (!stateVector || stateVector.length === 0) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        No state vector data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-4">
                <Plot
                    data={data}
                    layout={layout}
                    config={config}
                    className="w-full"
                    style={{ width: '100%', height: '450px' }}
                />
            </CardContent>
        </Card>
    );
}
