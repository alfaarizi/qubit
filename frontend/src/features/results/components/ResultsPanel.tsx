import { useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
    MeasurementHistogram,
    DensityMatrixHeatmap,
    EntanglementEntropyChart,
    ProbabilityComparison,
    StateVectorVisualization,
} from './visualizations';
import { PartitionDistributionHistogram } from '@/features/results/components/visualizations';
import { PartitionCircuitViewer } from './PartitionCircuitViewer';
import { useResultsStore } from '@/stores/resultsStore';
import type { SimulationResults, PartitionInfo } from '@/types';

export type { SimulationResults };

interface ResultsPanelProps {
    circuitId: string;
    partitionResult?: PartitionInfo;
    simulationResults?: SimulationResults;
}

export function ResultsPanel({ circuitId, partitionResult, simulationResults }: ResultsPanelProps) {
    const { setCircuitResults, getCircuitResults } = useResultsStore();

    // store results in memory only - persistence happens via ProjectWorkspace
    useEffect(() => {
        if (simulationResults && circuitId) {
            void setCircuitResults(circuitId, simulationResults);
        }
    }, [circuitId, simulationResults, setCircuitResults]);

    // Get persisted results if no new results are provided
    const results = simulationResults || (circuitId ? getCircuitResults(circuitId) : undefined);
    const partitions = partitionResult?.partitions || results?.partition_info?.partitions;

    // Extract partition metadata (for PartitionDistributionHistogram)
    const partitionStrategy = partitionResult?.strategy || results?.partition_info?.strategy;
    const maxPartitionSize = partitionResult?.max_partition_size || results?.partition_info?.max_partition_size;

    // Extract data from simulation results
    const fidelity = results?.comparison?.fidelity;
    const originalCounts = results?.original?.counts;
    const partitionedCounts = results?.partitioned?.counts;
    const originalProbs = results?.original?.probabilities;
    const partitionedProbs = results?.partitioned?.probabilities;
    const originalDensity = results?.original?.density_matrix;
    const partitionedDensity = results?.partitioned?.density_matrix;
    const originalEntropy = results?.original?.entropy_scaling;
    const partitionedEntropy = results?.partitioned?.entropy_scaling;
    const originalStateVector = results?.original?.state_vector;
    const partitionedStateVector = results?.partitioned?.state_vector;
    const numQubits = results?.num_qubits;
    const numShots = results?.num_shots;
    const errors = results?.errors;

    // Check if we have any results
    const hasResults = !!(
        fidelity !== undefined ||
        originalCounts ||
        partitionedCounts ||
        partitions
    );

    if (!hasResults) {
        return (
            <Card className="border-border/50 bg-card/95 h-full min-h-[400px] flex items-center justify-center" data-testid="results-empty-state">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <svg className="h-16 w-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-base font-medium">No Simulation Results</p>
                    <p className="text-sm mt-2">Run circuit partition to see quantum simulation visualizations</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6" data-testid="results-panel">
            {/* Header with Summary Stats */}
            <Card className="border-border/50 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur" data-testid="results-summary-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <CardTitle className="text-xl font-bold">Simulation Results</CardTitle>
                            <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="results-metadata">
                                {numShots && (
                                    <>
                                        <span>shots: {numShots.toLocaleString()}</span>
                                    </>
                                )}
                                {partitionStrategy && (
                                    <>
                                        {(numQubits || numShots || partitions) && <span>•</span>}
                                        <span>strategy: {partitionStrategy}</span>
                                    </>
                                )}
                                {maxPartitionSize && (
                                    <>
                                        {(numQubits || numShots || partitions || partitionStrategy) && <span>•</span>}
                                        <span>max partition size: {maxPartitionSize} qubits</span>
                                    </>
                                )}
                            </div>
                        </div>
                        {fidelity !== undefined && (
                            <div className="text-right" data-testid="results-fidelity">
                                <div className="text-sm text-muted-foreground">Circuit Fidelity</div>
                                <div className="text-3xl font-bold mt-1">
                                    <span className={fidelity >= 0.99 ? 'text-green-600 dark:text-green-400' : fidelity >= 0.95 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}>
                                        {(fidelity * 100).toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {errors && errors.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/50" data-testid="results-errors">
                            <div className="text-sm font-medium text-muted-foreground mb-2">Simulation Warnings</div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                                {errors.slice(0, 3).map((error, idx) => (
                                    <div key={idx}>
                                        {error.timeout ? '⏱️ Timeout' : '⚠️ Warning'} during {error.stage}: {error.error.substring(0, 80)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardHeader>
            </Card>

            {/* Partition Section */}
            {(partitions && partitions.length > 0) && (
                <div className="space-y-6" data-testid="results-partition-section">
                    {/* Partition Circuit Viewer */}
                    <div data-testid="results-partition-viewer">
                        <PartitionCircuitViewer
                            partitions={partitions}
                            maxPartitionSize={maxPartitionSize}
                        />
                    </div>

                    {/* Partition Distribution Analysis */}
                    {partitionStrategy && maxPartitionSize && (
                        <div data-testid="results-partition-histogram">
                            <PartitionDistributionHistogram
                                partitions={partitions}
                                strategy={partitionStrategy}
                                maxPartitionSize={maxPartitionSize}
                                plotId="plot-partition-distribution"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Measurements Section */}
            {(originalCounts || partitionedCounts || (originalProbs && partitionedProbs)) && (
                <div className="space-y-6" data-testid="results-measurements-section">
                    {/* Measurement Distribution Analysis */}
                    {(originalCounts || partitionedCounts) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="results-measurement-histograms">
                            {originalCounts && (
                                <div data-testid="results-measurement-original">
                                    <MeasurementHistogram
                                        counts={originalCounts}
                                        title="Original Circuit - Measurement Distribution"
                                        plotId="plot-measurement-original"
                                    />
                                </div>
                            )}
                            {partitionedCounts && (
                                <div data-testid="results-measurement-partitioned">
                                    <MeasurementHistogram
                                        counts={partitionedCounts}
                                        title="Partitioned Circuit - Measurement Distribution"
                                        plotId="plot-measurement-partitioned"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Probability Comparison Analysis */}
                    {originalProbs && partitionedProbs && (
                        <div data-testid="results-probability-comparison">
                            <ProbabilityComparison
                                probabilitiesOriginal={originalProbs}
                                probabilitiesPartitioned={partitionedProbs}
                                plotId="plot-probability-comparison"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Quantum State Section */}
            {(originalStateVector || partitionedStateVector || originalDensity || partitionedDensity) && (
                <div className="space-y-6" data-testid="results-quantum-state-section">
                    {/* State Vector Analysis */}
                    {(originalStateVector || partitionedStateVector) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="results-state-vectors">
                            {originalStateVector && (
                                <div data-testid="results-state-vector-original">
                                    <StateVectorVisualization
                                        stateVector={originalStateVector}
                                        title="Original Circuit - State Vector Amplitudes"
                                        plotId="plot-state-vector-original"
                                    />
                                </div>
                            )}
                            {partitionedStateVector && (
                                <div data-testid="results-state-vector-partitioned">
                                    <StateVectorVisualization
                                        stateVector={partitionedStateVector}
                                        title="Partitioned Circuit - State Vector Amplitudes"
                                        plotId="plot-state-vector-partitioned"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Density Matrix Heatmaps */}
                    {(originalDensity || partitionedDensity) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="results-density-matrices">
                            {originalDensity && (
                                <div data-testid="results-density-matrix-original">
                                    <DensityMatrixHeatmap
                                        densityMatrix={originalDensity}
                                        title="Original Circuit - Density Matrix"
                                        plotId="plot-density-matrix-original"
                                    />
                                </div>
                            )}
                            {partitionedDensity && (
                                <div data-testid="results-density-matrix-partitioned">
                                    <DensityMatrixHeatmap
                                        densityMatrix={partitionedDensity}
                                        title="Partitioned Circuit - Density Matrix"
                                        plotId="plot-density-matrix-partitioned"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Entropy Section */}
            {(originalEntropy || partitionedEntropy) && (
                <div data-testid="results-entropy-section">
                    <div data-testid="results-entropy-chart">
                        <EntanglementEntropyChart
                            entropyOriginal={originalEntropy || []}
                            entropyPartitioned={partitionedEntropy || []}
                            plotId="plot-entropy-scaling"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
