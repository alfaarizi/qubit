import { Card, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3 } from 'lucide-react';

interface MeasurementResult {
    state: string;
    count: number;
    probability: number;
}

interface ResultsPanelProps {
    results?: MeasurementResult[];
    totalShots?: number;
    executionTime?: number;
}

export function ResultsPanel({
    results = [],
    totalShots = 0,
    executionTime = 0,
    }: ResultsPanelProps) {
    const hasResults = results.length > 0;

    return (
        <Card className="border-border/50 bg-card/95">
            <CardHeader className="pb-3">
                <Tabs defaultValue="results" className="w-full">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="results" className="gap-2">
                                <BarChart3 className="h-4 w-4" />
                                Results
                            </TabsTrigger>
                            <TabsTrigger value="statevector">State Vector</TabsTrigger>
                            <TabsTrigger value="histogram">Histogram</TabsTrigger>
                        </TabsList>

                        {hasResults && (
                            <div className="text-xs text-muted-foreground">
                                Shots: {totalShots} • Completed in {executionTime.toFixed(2)}s
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