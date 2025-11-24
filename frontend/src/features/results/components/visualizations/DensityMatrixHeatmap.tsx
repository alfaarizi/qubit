import { useMemo, memo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from 'next-themes';

interface DensityMatrixHeatmapProps {
    densityMatrix: {
        real: number[][] | null;
        imag: number[][] | null;
    };
    title: string;
    plotId?: string;
}

export const DensityMatrixHeatmap = memo(function DensityMatrixHeatmap({ densityMatrix, title, plotId }: DensityMatrixHeatmapProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const data = useMemo(() => {
        if (!densityMatrix.real || !densityMatrix.imag) {
            return [];
        }

        // Ensure matrices are arrays
        let realMatrix: number[][];
        if (Array.isArray(densityMatrix.real)) {
            realMatrix = densityMatrix.real;
        } else if (typeof densityMatrix.real === 'object' && densityMatrix.real !== null) {
            console.warn('[DensityMatrixHeatmap] real matrix is not an array, attempting conversion:', densityMatrix.real);
            realMatrix = Object.values(densityMatrix.real);
        } else {
            console.error('[DensityMatrixHeatmap] Invalid real matrix format:', densityMatrix.real);
            return [];
        }

        let imagMatrix: number[][];
        if (Array.isArray(densityMatrix.imag)) {
            imagMatrix = densityMatrix.imag;
        } else if (typeof densityMatrix.imag === 'object' && densityMatrix.imag !== null) {
            console.warn('[DensityMatrixHeatmap] imag matrix is not an array, attempting conversion:', densityMatrix.imag);
            imagMatrix = Object.values(densityMatrix.imag);
        } else {
            console.error('[DensityMatrixHeatmap] Invalid imag matrix format:', densityMatrix.imag);
            return [];
        }

        // Calculate magnitude: |ρ_ij| = sqrt(real^2 + imag^2)
        const magnitude = realMatrix.map((row, i) => {
            // Ensure row is an array
            const realRow = Array.isArray(row) ? row : Object.values(row);
            const imagRow = Array.isArray(imagMatrix[i]) ? imagMatrix[i] : Object.values(imagMatrix[i]);

            return realRow.map((realVal, j) => {
                const realNum = typeof realVal === 'number' ? realVal : Number(realVal);
                const imagNum = typeof imagRow[j] === 'number' ? imagRow[j] : Number(imagRow[j]);
                return Math.sqrt(realNum * realNum + imagNum * imagNum);
            });
        });

        return [{
            type: 'heatmap' as const,
            z: magnitude,
            colorscale: [
                [0, isDark ? '#1e1b4b' : '#eff6ff'],
                [0.25, isDark ? '#3730a3' : '#bfdbfe'],
                [0.5, isDark ? '#6366f1' : '#60a5fa'],
                [0.75, isDark ? '#a78bfa' : '#3b82f6'],
                [1, isDark ? '#e879f9' : '#1d4ed8']
            ],
            hovertemplate: '<b>ρ[%{y},%{x}]</b><br>' +
                'Magnitude: %{z:.4f}<br>' +
                '<extra></extra>',
            colorbar: {
                title: '|ρ|',
                titleside: 'right',
                tickfont: { color: isDark ? '#9ca3af' : '#6b7280' },
                titlefont: { color: isDark ? '#9ca3af' : '#6b7280' }
            }
        }];
    }, [densityMatrix, isDark]);

    const layout = useMemo(() => ({
        title: {
            text: title,
            font: { size: 14, color: isDark ? '#e5e7eb' : '#1f2937' }
        },
        xaxis: {
            title: 'Column Index',
            color: isDark ? '#9ca3af' : '#6b7280',
            showgrid: false,
        },
        yaxis: {
            title: 'Row Index',
            color: isDark ? '#9ca3af' : '#6b7280',
            autorange: 'reversed' as const,
            showgrid: false,
        },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { l: 60, r: 80, t: 40, b: 60 },
        font: { family: 'ui-monospace, monospace' }
    }), [title, isDark]);

    const config = useMemo(() => ({
        responsive: true,
        displayModeBar: false,
        displaylogo: false
    }), []);

    if (!densityMatrix.real || !densityMatrix.imag) {
        return (
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        No density matrix data available
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
                    style={{ width: '100%', height: '500px' }}
                />
            </CardContent>
        </Card>
    );
});
