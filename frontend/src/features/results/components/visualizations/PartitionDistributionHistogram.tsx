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
    circuitName?: string;
}

export const PartitionDistributionHistogram = memo(function PartitionDistributionHistogram({
    partitions,
    strategy,
    maxPartitionSize,
    plotId,
    circuitName
}: PartitionDistributionHistogramProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const { partitionLabels, gatesCounts, qubitCounts, avgQubits, avgGates } = useMemo(() => {
        if (!partitions || partitions.length === 0) {
            return {
                partitionLabels: [],
                gatesCounts: [],
                qubitCounts: [],
                avgQubits: 0,
                avgGates: 0
            };
        }

        const partitionLabels = partitions.map(p => `P${p.index}`);
        const gatesCounts = partitions.map(p => p.num_gates);
        const qubitCounts = partitions.map(p => p.num_qubits);

        const avgQubits = Math.round(qubitCounts.reduce((a, b) => a + b, 0) / qubitCounts.length);
        const avgGates = Math.round(gatesCounts.reduce((a, b) => a + b, 0) / gatesCounts.length);

        return { partitionLabels, gatesCounts, qubitCounts, avgQubits, avgGates };
    }, [partitions]);

    const data = useMemo(() => {
        if (!partitions || partitions.length === 0) {
            return [];
        }

        return [
            {
                type: 'bar',
                name: 'Gates',
                x: partitionLabels,
                y: gatesCounts,
                marker: {
                    color: qubitCounts.map((count) => {
                        const ratio = count / maxPartitionSize;
                        if (ratio >= 0.85) return '#10b981'; // green >=85%
                        if (ratio >= 0.70) return '#fbbf24'; // yellow 70-85%
                        if (ratio >= 0.55) return '#f97316'; // orange 55-70%
                        return '#ef4444'; // red <55%
                    }),
                    line: {
                        color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                        width: 1.5
                    }
                },
                hovertemplate: '<b>%{x}</b><br>' +
                    'Gates: %{y}<br>' +
                    '<extra></extra>',
                yaxis: 'y',
            },
            {
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Qubits',
                x: partitionLabels,
                y: qubitCounts,
                line: {
                    color: '#a78bfa',
                    width: 3,
                    shape: 'spline'
                },
                marker: {
                    size: 6,
                    color: '#a78bfa',
                    symbol: 'diamond',
                    line: {
                        color: isDark ? '#1f2937' : '#ffffff',
                        width: 1.5
                    }
                },
                hovertemplate: '<b>%{x}</b><br>' +
                    'Qubits: %{y}<br>' +
                    '<extra></extra>',
                yaxis: 'y2',
            },
            {
                type: 'scatter',
                mode: 'lines',
                name: 'Max Qubits',
                x: partitionLabels,
                y: Array(partitionLabels.length).fill(maxPartitionSize),
                line: {
                    color: isDark ? '#10b981' : '#059669',
                    width: 2,
                    dash: 'dot'
                },
                hoverinfo: 'skip',
                yaxis: 'y2',
                showlegend: false
            },
            {
                type: 'scatter',
                mode: 'lines',
                name: 'Avg Qubits',
                x: partitionLabels,
                y: Array(partitionLabels.length).fill(avgQubits),
                line: {
                    color: isDark ? '#a78bfa' : '#8b5cf6',
                    width: 2,
                    dash: 'dot'
                },
                hoverinfo: 'skip',
                yaxis: 'y2',
                showlegend: false
            },
            {
                type: 'scatter',
                mode: 'lines',
                name: 'Avg Gates',
                x: partitionLabels,
                y: Array(partitionLabels.length).fill(avgGates),
                line: {
                    color: isDark ? '#3b82f6' : '#2563eb',
                    width: 2,
                    dash: 'dot'
                },
                hoverinfo: 'skip',
                yaxis: 'y',
                showlegend: false
            }
        ];
    }, [partitionLabels, gatesCounts, qubitCounts, avgQubits, avgGates, maxPartitionSize, isDark]);

    const layout = useMemo(() => ({
        title: {
            text: `Partition Distribution (${maxPartitionSize} qubits per circuit, by ${strategy})`,
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
            title: 'Qubits',
            overlaying: 'y',
            side: 'right',
            color: '#a78bfa',
            showgrid: false,
        },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { l: 60, r: 60, t: 60, b: 95 },
        hovermode: 'x unified',
        annotations: (() => {
            const createAnnotation = (text: string, y: number, yref: string, color: string, x: number, xanchor: 'left' | 'right' | 'center', yanchor: 'bottom' | 'top', size = 11, padding = 4) => ({
                text,
                xref: 'paper' as const,
                yref,
                x,
                y,
                xanchor,
                yanchor,
                showarrow: false,
                font: { size, color },
                bgcolor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
                borderpad: padding
            });

            const qubitsGap = Math.abs(maxPartitionSize - avgQubits);
            const hasQubitOverlap = qubitsGap < maxPartitionSize * 0.15;
            const qubitCompactMode = hasQubitOverlap ? { size: 10, padding: 3 } : { size: 11, padding: 4 };

            // Check if avgGates is in the upper range that might collide with legend
            const maxGatesValue = Math.max(...gatesCounts);
            const isAvgGatesHigh = avgGates > maxGatesValue * 0.7;

            return [
                createAnnotation(
                    `Avg Gates: ${avgGates}`,
                    avgGates,
                    'y',
                    isDark ? '#3b82f6' : '#2563eb',
                    isAvgGatesHigh ? 0.14 : 0.02,
                    'left',
                    'bottom',
                    11,
                    4
                ),
                createAnnotation(
                    hasQubitOverlap ? `Max qubits: ${maxPartitionSize}` : `Max Qubits: ${maxPartitionSize}`,
                    maxPartitionSize,
                    'y2',
                    isDark ? '#10b981' : '#059669',
                    0.98,
                    'right',
                    'bottom',
                    qubitCompactMode.size,
                    qubitCompactMode.padding
                ),
                createAnnotation(
                    hasQubitOverlap ? `Avg qubits: ${avgQubits}` : `Avg Qubits: ${avgQubits}`,
                    avgQubits,
                    'y2',
                    isDark ? '#a78bfa' : '#8b5cf6',
                    0.98,
                    'right',
                    hasQubitOverlap ? 'top' : 'bottom',
                    qubitCompactMode.size,
                    qubitCompactMode.padding
                ),
                {
                    text: `Source: ${circuitName || 'Unknown Circuit'}`,
                    xref: 'paper' as const,
                    yref: 'paper' as const,
                    x: 0.5,
                    y: -0.10,
                    xanchor: 'center',
                    yanchor: 'top',
                    showarrow: false,
                    font: { size: 10, color: isDark ? '#9ca3af' : '#6b7280' },
                    bgcolor: 'transparent',
                }
            ];
        })(),
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
    }), [strategy, isDark, avgGates, avgQubits, maxPartitionSize, gatesCounts, circuitName]);

    const config = useMemo(() => ({
        responsive: true,
        displayModeBar: false,
        displaylogo: false,
        toImageButtonOptions: {
            format: 'png',
            filename: `partition-distribution-${strategy}${circuitName ? `-${circuitName}` : ''}`,
            height: 450,
            width: 1200,
            scale: 2
        }
    }), [strategy, circuitName]);

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
                    style={{ width: '100%', height: '480px' }}
                />
            </CardContent>
        </Card>
    );
});
