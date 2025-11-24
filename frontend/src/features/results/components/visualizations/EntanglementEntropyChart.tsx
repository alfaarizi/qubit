import { useMemo, memo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from 'next-themes';

interface EntropyData {
    subsystem_size: number;
    entropy: number;
}

interface EntanglementEntropyChartProps {
    entropyOriginal: EntropyData[];
    entropyPartitioned: EntropyData[];
}

export const EntanglementEntropyChart = memo(function EntanglementEntropyChart({
    entropyOriginal,
    entropyPartitioned
}: EntanglementEntropyChartProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const data = useMemo(() => {
        const traces = [];

        // Convert entropyOriginal to array if needed
        let originalArray: EntropyData[] = [];
        if (entropyOriginal) {
            if (Array.isArray(entropyOriginal)) {
                originalArray = entropyOriginal;
            } else if (typeof entropyOriginal === 'object') {
                console.warn('[EntanglementEntropyChart] entropyOriginal is not an array, attempting conversion:', entropyOriginal);
                originalArray = Object.values(entropyOriginal);
            }
        }

        if (originalArray && originalArray.length > 0) {
            traces.push({
                type: 'scatter' as const,
                mode: 'lines+markers' as const,
                name: 'Original Circuit',
                x: originalArray.map(d => typeof d === 'object' && 'subsystem_size' in d ? d.subsystem_size : 0),
                y: originalArray.map(d => typeof d === 'object' && 'entropy' in d ? d.entropy : 0),
                line: {
                    color: '#3b82f6',
                    width: 2,
                    shape: 'spline' as const,
                },
                marker: {
                    size: 8,
                    color: '#3b82f6',
                    symbol: 'circle'
                },
                hovertemplate: '<b>Original</b><br>' +
                    'Subsystem Size: %{x}<br>' +
                    'Entropy: %{y:.4f}<br>' +
                    '<extra></extra>',
            });
        }

        // Convert entropyPartitioned to array if needed
        let partitionedArray: EntropyData[] = [];
        if (entropyPartitioned) {
            if (Array.isArray(entropyPartitioned)) {
                partitionedArray = entropyPartitioned;
            } else if (typeof entropyPartitioned === 'object') {
                console.warn('[EntanglementEntropyChart] entropyPartitioned is not an array, attempting conversion:', entropyPartitioned);
                partitionedArray = Object.values(entropyPartitioned);
            }
        }

        if (partitionedArray && partitionedArray.length > 0) {
            traces.push({
                type: 'scatter' as const,
                mode: 'lines+markers' as const,
                name: 'Partitioned Circuit',
                x: partitionedArray.map(d => typeof d === 'object' && 'subsystem_size' in d ? d.subsystem_size : 0),
                y: partitionedArray.map(d => typeof d === 'object' && 'entropy' in d ? d.entropy : 0),
                line: {
                    color: '#a78bfa',
                    width: 2,
                    shape: 'spline' as const,
                    dash: 'dot' as const
                },
                marker: {
                    size: 8,
                    color: '#a78bfa',
                    symbol: 'diamond'
                },
                hovertemplate: '<b>Partitioned</b><br>' +
                    'Subsystem Size: %{x}<br>' +
                    'Entropy: %{y:.4f}<br>' +
                    '<extra></extra>',
            });
        }

        return traces;
    }, [entropyOriginal, entropyPartitioned]);

    const layout = useMemo(() => ({
        title: {
            text: 'Entanglement Entropy Scaling',
            font: { size: 14, color: isDark ? '#e5e7eb' : '#1f2937' }
        },
        xaxis: {
            title: 'Subsystem Size (qubits)',
            color: isDark ? '#9ca3af' : '#6b7280',
            gridcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        yaxis: {
            title: 'Von Neumann Entropy',
            color: isDark ? '#9ca3af' : '#6b7280',
            gridcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { l: 60, r: 30, t: 40, b: 60 },
        hovermode: 'closest' as const,
        legend: {
            x: 0.02,
            y: 0.98,
            bgcolor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
            bordercolor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            borderwidth: 1,
            font: { color: isDark ? '#e5e7eb' : '#1f2937' }
        },
        font: { family: 'ui-monospace, monospace' }
    }), [isDark]);

    const config = useMemo(() => ({
        responsive: true,
        displayModeBar: false,
        displaylogo: false
    }), []);

    if ((!entropyOriginal || entropyOriginal.length === 0) &&
        (!entropyPartitioned || entropyPartitioned.length === 0)) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        No entropy data available
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
                    style={{ width: '100%', height: '400px' }}
                />
            </CardContent>
        </Card>
    );
});
