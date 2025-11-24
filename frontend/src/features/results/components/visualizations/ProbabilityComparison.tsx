import { useMemo, memo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from 'next-themes';

interface ProbabilityComparisonProps {
    probabilitiesOriginal: number[];
    probabilitiesPartitioned: number[];
    maxStates?: number;
}

export const ProbabilityComparison = memo(function ProbabilityComparison({
    probabilitiesOriginal,
    probabilitiesPartitioned,
    maxStates = 16
}: ProbabilityComparisonProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const data = useMemo(() => {
        // Ensure probability arrays are arrays
        let originalArray: number[];
        if (Array.isArray(probabilitiesOriginal)) {
            originalArray = probabilitiesOriginal;
        } else if (typeof probabilitiesOriginal === 'object' && probabilitiesOriginal !== null) {
            console.warn('[ProbabilityComparison] probabilitiesOriginal is not an array, attempting conversion:', probabilitiesOriginal);
            originalArray = Object.values(probabilitiesOriginal);
        } else {
            console.error('[ProbabilityComparison] Invalid probabilitiesOriginal format:', probabilitiesOriginal);
            return [];
        }

        let partitionedArray: number[];
        if (Array.isArray(probabilitiesPartitioned)) {
            partitionedArray = probabilitiesPartitioned;
        } else if (typeof probabilitiesPartitioned === 'object' && probabilitiesPartitioned !== null) {
            console.warn('[ProbabilityComparison] probabilitiesPartitioned is not an array, attempting conversion:', probabilitiesPartitioned);
            partitionedArray = Object.values(probabilitiesPartitioned);
        } else {
            console.error('[ProbabilityComparison] Invalid probabilitiesPartitioned format:', probabilitiesPartitioned);
            return [];
        }

        // Find top N states by probability (from either circuit)
        const combined = originalArray.map((prob, idx) => ({
            idx,
            original: prob,
            partitioned: typeof partitionedArray[idx] === 'number' ? partitionedArray[idx] : Number(partitionedArray[idx] || 0),
            max: Math.max(
                prob,
                typeof partitionedArray[idx] === 'number' ? partitionedArray[idx] : Number(partitionedArray[idx] || 0)
            )
        }));

        const topStates = combined
            .sort((a, b) => b.max - a.max)
            .slice(0, maxStates);

        const stateLabels = topStates.map(s => `|${s.idx.toString(2).padStart(Math.ceil(Math.log2(originalArray.length)), '0')}⟩`);

        return [
            {
                type: 'bar' as const,
                name: 'Original',
                x: stateLabels,
                y: topStates.map(s => s.original),
                marker: {
                    color: '#3b82f6',
                    opacity: 0.7,
                },
                hovertemplate: '<b>Original</b><br>State: %{x}<br>Probability: %{y:.6f}<extra></extra>',
            },
            {
                type: 'bar' as const,
                name: 'Partitioned',
                x: stateLabels,
                y: topStates.map(s => s.partitioned),
                marker: {
                    color: '#a78bfa',
                    opacity: 0.7,
                },
                hovertemplate: '<b>Partitioned</b><br>State: %{x}<br>Probability: %{y:.6f}<extra></extra>',
            }
        ];
    }, [probabilitiesOriginal, probabilitiesPartitioned, maxStates]);

    const layout = useMemo(() => ({
        title: {
            text: 'Probability Distribution Comparison',
            font: { size: 14, color: isDark ? '#e5e7eb' : '#1f2937' }
        },
        xaxis: {
            title: 'Quantum State',
            tickangle: -45,
            color: isDark ? '#9ca3af' : '#6b7280',
            gridcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        yaxis: {
            title: 'Probability',
            color: isDark ? '#9ca3af' : '#6b7280',
            gridcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        barmode: 'group' as const,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { l: 60, r: 30, t: 40, b: 80 },
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

    if (!probabilitiesOriginal || !probabilitiesPartitioned) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        No probability data available
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
});
