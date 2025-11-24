import { useMemo, memo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from 'next-themes';
import type { Partition } from '@/types';

interface PartitionDistributionHistogramProps {
    partitions: Partition[];
    strategy: string;
    maxPartitionSize: number;
    plotId?: string;
}

export const PartitionDistributionHistogram = memo(function PartitionDistributionHistogram({
    partitions,
    strategy,
    maxPartitionSize,
    plotId
}: PartitionDistributionHistogramProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const data = useMemo(() => {
        if (!partitions || partitions.length === 0) {
            return [];
        }

        const partitionLabels = partitions.map(p => `P${p.index}`);
        const gatesCounts = partitions.map(p => p.num_gates);
        const qubitCounts = partitions.map(p => p.num_qubits);

        return [
            {
                type: 'bar',
                name: 'Gates',
                x: partitionLabels,
                y: gatesCounts,
                marker: {
                    color: gatesCounts.map((count) => {
                        const ratio = count / maxPartitionSize;
                        if (ratio > 0.9) return '#ef4444'; // red - near limit
                        if (ratio > 0.7) return '#f59e0b'; // orange
                        if (ratio > 0.5) return '#3b82f6'; // blue
                        return '#10b981'; // green - efficient
                    }),
                    line: {
                        color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                        width: 1.5
                    }
                },
                hovertemplate: '<b>%{x}</b><br>' +
                    'Gates: %{y}<br>' +
                    'Utilization: %{customdata:.1f}%<br>' +
                    '<extra></extra>',
                customdata: gatesCounts.map(c => (c / maxPartitionSize) * 100),
                yaxis: 'y',
            },
            {
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Qubits Used',
                x: partitionLabels,
                y: qubitCounts,
                line: {
                    color: '#a78bfa',
                    width: 3,
                    shape: 'spline'
                },
                marker: {
                    size: 10,
                    color: '#a78bfa',
                    symbol: 'diamond',
                    line: {
                        color: isDark ? '#1f2937' : '#ffffff',
                        width: 2
                    }
                },
                hovertemplate: '<b>%{x}</b><br>' +
                    'Qubits: %{y}<br>' +
                    '<extra></extra>',
                yaxis: 'y2',
            }
        ];
    }, [partitions, maxPartitionSize, isDark]);

    const layout = useMemo(() => ({
        title: {
            text: `Partition Distribution (${strategy})`,
            font: { size: 14, color: isDark ? '#e5e7eb' : '#1f2937' }
        },
        xaxis: {
            title: 'Partition',
            color: isDark ? '#9ca3af' : '#6b7280',
            gridcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            showgrid: true,
        },
        yaxis: {
            title: 'Number of Gates',
            color: isDark ? '#9ca3af' : '#6b7280',
            gridcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            showgrid: true,
            zeroline: false,
        },
        yaxis2: {
            title: 'Qubits Used',
            overlaying: 'y',
            side: 'right',
            color: '#a78bfa',
            showgrid: false,
        },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { l: 60, r: 60, t: 60, b: 60 },
        hovermode: 'x unified',
        legend: {
            x: 0.02,
            y: 0.98,
            bgcolor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
            bordercolor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            borderwidth: 1,
            font: { color: isDark ? '#e5e7eb' : '#1f2937' }
        },
        font: { family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
        barmode: 'overlay',
    }), [strategy, isDark]);

    const config = useMemo(() => ({
        responsive: true,
        displayModeBar: false,
        displaylogo: false,
        toImageButtonOptions: {
            format: 'png',
            filename: `partition-distribution-${strategy}`,
            height: 600,
            width: 1200,
            scale: 2
        }
    }), [strategy]);

    if (!partitions || partitions.length === 0) {
        return null;
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
