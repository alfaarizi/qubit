import { useMemo, memo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useTheme } from 'next-themes';

interface MeasurementHistogramProps {
    counts: Record<string, number>;
    title: string;
    maxBars?: number;
    plotId?: string;
}

export const MeasurementHistogram = memo(function MeasurementHistogram({ counts, title, maxBars = 20, plotId }: MeasurementHistogramProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const data = useMemo(() => {
        // Ensure counts is an object
        if (!counts || typeof counts !== 'object') {
            console.error('[MeasurementHistogram] Invalid counts format:', counts);
            return [];
        }

        const entries = Object.entries(counts)
            .sort(([, a], [, b]) => (b) - (a))
            .slice(0, maxBars);

        return [{
            type: 'bar' as const,
            x: entries.map(([state]) => state),
            y: entries.map(([, count]) => count),
            marker: {
                color: entries.map((_, i) => `hsl(${220 + i * 10}, 70%, 50%)`),
                line: {
                    color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                    width: 1
                }
            },
            hovertemplate: '<b>State</b>: |%{x}⟩<br><b>Count</b>: %{y}<br><extra></extra>',
        }];
    }, [counts, maxBars, isDark]);

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
            title: 'Measurement Count',
            color: isDark ? '#9ca3af' : '#6b7280',
            gridcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { l: 60, r: 30, t: 40, b: 80 },
        hovermode: 'closest' as const,
        font: { family: 'ui-monospace, monospace' }
    }), [title, isDark]);

    const config = useMemo(() => ({
        responsive: true,
        displayModeBar: false,
        displaylogo: false
    }), []);

    if (Object.keys(counts).length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        No measurement data available
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-4">
                <Plot
                    divId={plotId}
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
