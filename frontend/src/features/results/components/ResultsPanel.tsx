import { Card, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Layers } from 'lucide-react';
import { PartitionCircuitViewer } from './PartitionCircuitViewer';

interface MeasurementResult {
    state: string;
    count: number;
    probability: number;
}

interface GateDetail {
    id: string;
    name: string;
    targetQubits: number[];
    controlQubits: number[];
}

interface PartitionInfo {
    index: number;
    numGates: number;
    qubits: number[];
    numQubits: number;
    gates: GateDetail[];
}

interface PartitionResult {
    strategy: string;
    maxPartitionSize: number;
    totalPartitions: number;
    totalGates: number;
    partitions: PartitionInfo[];
}

interface ResultsPanelProps {
    results?: MeasurementResult[];
    totalShots?: number;
    executionTime?: number;
    partitionResult?: PartitionResult;
}

export function ResultsPanel({
    results = [],
    totalShots = 0,
    executionTime = 0,
    partitionResult,
    }: ResultsPanelProps) {
    const hasResults = results.length > 0;
    const hasPartitionResults = !!partitionResult;

    return (
        <Card className="border-border/50 bg-card/95">
            <CardHeader className="pb-3">
                <Tabs defaultValue={hasPartitionResults ? "partitions" : "results"} className="w-full">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="results" className="gap-2">
                                <BarChart3 className="h-4 w-4" />
                                Measurements
                            </TabsTrigger>
                            <TabsTrigger value="partitions" className="gap-2">
                                <Layers className="h-4 w-4" />
                                Partitions
                            </TabsTrigger>
                            <TabsTrigger value="statevector">State Vector</TabsTrigger>
                            <TabsTrigger value="histogram">Histogram</TabsTrigger>
                        </TabsList>

                        {hasResults && (
                            <div className="text-xs text-muted-foreground">
                                Shots: {totalShots} • Completed in {executionTime.toFixed(2)}s
                            </div>
                        )}
                        {hasPartitionResults && (
                            <div className="text-xs text-muted-foreground">
                                Strategy: {partitionResult.strategy} • {partitionResult.totalPartitions} partitions
                            </div>
                        )}
                    </div>

                    <TabsContent value="results" className="mt-4">
                        {!hasResults ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
                                <p className="text-sm">No results yet</p>
                                <p className="text-xs mt-1">Run your circuit to see results</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Results Table */}
                                <div>
                                    <h3 className="text-sm font-semibold mb-3">Measurement Outcomes</h3>
                                    <div className="border rounded-lg overflow-hidden">
                                        {/* Table Header */}
                                        <div className="bg-muted/50 grid grid-cols-4 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                                            <div>State</div>
                                            <div>Count</div>
                                            <div>Probability</div>
                                            <div>Visualization</div>
                                        </div>

                                        {/* Table Rows */}
                                        {results.map((result, idx) => (
                                            <div
                                                key={result.state}
                                                className={`grid grid-cols-4 gap-4 px-4 py-3 text-sm items-center ${
                                                    idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                                                }`}
                                            >
                                                <div className="font-mono">{result.state}</div>
                                                <div className="font-mono text-muted-foreground">{result.count}</div>
                                                <div className="font-mono text-muted-foreground">
                                                    {(result.probability * 100).toFixed(1)}%
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary"
                                                            style={{ width: `${result.probability * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground w-10 text-right">
                                                        {(result.probability * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Statistics Summary */}
                                <div className="bg-muted/30 rounded-lg p-4">
                                    <h3 className="text-sm font-semibold mb-3">Statistics Summary</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                        <div>
                                            <div className="text-muted-foreground">Total Shots</div>
                                            <div className="font-mono font-medium mt-1">{totalShots}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Unique States</div>
                                            <div className="font-mono font-medium mt-1">{results.length}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Most Frequent</div>
                                            <div className="font-mono font-medium mt-1">
                                                {results[0]?.state} ({(results[0]?.probability * 100).toFixed(1)}%)
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Execution Time</div>
                                            <div className="font-mono font-medium mt-1">{executionTime.toFixed(2)}s</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="partitions" className="mt-4">
                        {!hasPartitionResults ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Layers className="h-12 w-12 mb-4 opacity-20" />
                                <p className="text-sm">No partition results yet</p>
                                <p className="text-xs mt-1">Run circuit partitioning to see results</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Partition Circuit Viewer - Placed before summary */}
                                <PartitionCircuitViewer partitions={partitionResult.partitions} />

                                {/* Partition Summary */}
                                <div className="bg-muted/30 rounded-lg p-4">
                                    <h3 className="text-sm font-semibold mb-3">Partition Summary</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                        <div>
                                            <div className="text-muted-foreground">Strategy</div>
                                            <div className="font-mono font-medium mt-1">{partitionResult.strategy}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Total Partitions</div>
                                            <div className="font-mono font-medium mt-1">{partitionResult.totalPartitions}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Total Gates</div>
                                            <div className="font-mono font-medium mt-1">{partitionResult.totalGates}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Max Partition Size</div>
                                            <div className="font-mono font-medium mt-1">{partitionResult.maxPartitionSize}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Partitions Table */}
                                <div>
                                    <h3 className="text-sm font-semibold mb-3">Partition Details</h3>
                                    <div className="border rounded-lg overflow-hidden">
                                        {/* Table Header */}
                                        <div className="bg-muted/50 grid grid-cols-5 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                                            <div>Partition</div>
                                            <div>Gates</div>
                                            <div>Qubits Used</div>
                                            <div>Qubit Count</div>
                                            <div>Size Ratio</div>
                                        </div>

                                        {/* Table Rows */}
                                        {partitionResult.partitions.map((partition, idx) => {
                                            const sizeRatio = (partition.numGates / partitionResult.maxPartitionSize) * 100;
                                            return (
                                                <div
                                                    key={partition.index}
                                                    className={`grid grid-cols-5 gap-4 px-4 py-3 text-sm items-center ${
                                                        idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                                                    }`}
                                                >
                                                    <div className="font-mono">P{partition.index}</div>
                                                    <div className="font-mono text-muted-foreground">{partition.numGates}</div>
                                                    <div className="font-mono text-xs text-muted-foreground">
                                                        {partition.qubits.join(', ')}
                                                    </div>
                                                    <div className="font-mono text-muted-foreground">{partition.numQubits}</div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary"
                                                                style={{ width: `${Math.min(sizeRatio, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-muted-foreground w-10 text-right">
                                                            {sizeRatio.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Partition Visualization */}
                                <div>
                                    <h3 className="text-sm font-semibold mb-3">Partition Distribution</h3>
                                    <div className="space-y-2">
                                        {partitionResult.partitions.map((partition) => {
                                            const widthPercent = (partition.numGates / partitionResult.totalGates) * 100;
                                            return (
                                                <div key={partition.index} className="flex items-center gap-3">
                                                    <div className="text-xs font-mono text-muted-foreground w-8">P{partition.index}</div>
                                                    <div className="flex-1 h-8 bg-muted rounded overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary/70 flex items-center justify-center text-xs font-medium text-primary-foreground"
                                                            style={{ width: `${Math.max(widthPercent, 5)}%` }}
                                                        >
                                                            {partition.numGates} gates
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground w-12 text-right">
                                                        {widthPercent.toFixed(1)}%
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="statevector" className="mt-4">
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <p className="text-sm">State vector view</p>
                            <p className="text-xs mt-1">Coming soon</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="histogram" className="mt-4">
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <p className="text-sm">Histogram view</p>
                            <p className="text-xs mt-1">Coming soon</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardHeader>
        </Card>
    );
}