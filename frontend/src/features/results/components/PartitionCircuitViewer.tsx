import { useState, useMemo, useRef, useEffect, useTransition } from 'react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useCircuitRenderer } from '@/features/circuit/hooks/useCircuitRenderer';
import { useCircuitDAG } from '@/features/circuit/hooks/useCircuitDAG';
import { useCircuitStore } from '@/features/circuit/store/CircuitStoreContext';
import { deserializeGateFromAPI } from '@/lib/api/circuits';
import { GATE_CONFIG } from '@/features/gates/constants';
import { getMaxDepth } from '@/features/gates/utils';
import { CIRCUIT_CONFIG } from '@/features/circuit/constants';
import type { Gate } from '@/features/gates/types';
import type { Partition } from '@/types';

interface PartitionCircuitViewerProps {
    partitions: Partition[];
    maxPartitionSize?: number;
}

interface PartitionBoundary {
    index: number;
    start: number;
    end: number;
}

interface CircuitData {
    gates: Gate[];
    maxDepth: number;
    boundaries?: PartitionBoundary[];
}

export function PartitionCircuitViewer({ partitions, maxPartitionSize }: PartitionCircuitViewerProps) {
    const [viewMode, setViewMode] = useState<'sequential' | 'individual'>('sequential');
    const [selectedIndex, setSelectedIndex] = useState<number>(partitions.length > 0 ? partitions[0].index : 0);
    const [hoveredPartition, setHoveredPartition] = useState<number | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { batchInjectGates } = useCircuitDAG();
    const highlightEnabled = useCircuitStore((state) => state.partitionHighlightEnabled);
    const setPartitionHighlightEnabled = useCircuitStore((state) => state.setPartitionHighlightEnabled);
    const setPartitionHighlightIds = useCircuitStore((state) => state.setPartitionHighlightIds);
    const [, startTransition] = useTransition();

    const globalQubits = useMemo(() => {
        const qubitSet = new Set<number>();
        partitions.forEach(p => p.qubits.forEach(q => qubitSet.add(q)));
        return Array.from(qubitSet).sort((a, b) => a - b);
    }, [partitions]);

    const globalQubitMap = useMemo(() => {
        const map: Record<number, number> = {};
        globalQubits.forEach((global, local) => { map[global] = local; });
        return map;
    }, [globalQubits]);

    const { sequentialCircuit, individualCircuits } = useMemo(() => {
        const allGates: Gate[] = [];
        const boundaries: PartitionBoundary[] = [];
        const circuits = new Map<number, CircuitData>();
        let offset = 0;

        for (const partition of partitions) {
            const gates = batchInjectGates(partition.gates.map((g) =>
                deserializeGateFromAPI({
                    id: g.id,
                    depth: 0,
                    gate: { name: g.name },
                    target_qubits: g.target_qubits.map(q => globalQubitMap[q]),
                    control_qubits: g.control_qubits.map(q => globalQubitMap[q]),
                    parameters: [],
                }) as Gate
            )) as Gate[];

            const depth = gates.length ? getMaxDepth(gates) + 1 : 0;
            allGates.push(...gates.map(g => ({ ...g, depth: g.depth + offset })));
            boundaries.push({ index: partition.index, start: offset, end: offset + depth });
            circuits.set(partition.index, { gates, maxDepth: Math.max(depth, 1) });
            offset += depth;
        }

        return {
            sequentialCircuit: { gates: allGates, maxDepth: offset, boundaries },
            individualCircuits: circuits
        };
    }, [partitions, globalQubitMap, batchInjectGates]);

    const individualCircuit = individualCircuits.get(selectedIndex) || { gates: [], maxDepth: 1 };

    const circuit = viewMode === 'sequential' ? sequentialCircuit : individualCircuit;
    const canvasWidth = Math.max(circuit.maxDepth * GATE_CONFIG.gateSpacing + 100, 400);
    const canvasHeight = globalQubits.length * GATE_CONFIG.qubitSpacing + CIRCUIT_CONFIG.headerHeight + CIRCUIT_CONFIG.footerHeight;
    const maxHeight = Math.min(canvasHeight, 385);

    const { partitionMap, partitionMeta } = useMemo(() => {
        const map = new Map<number, Partition>();
        const meta = new Map<number, { minQubit: number; gateIds: string[] }>();
        for (const p of partitions) {
            map.set(p.index, p);
            meta.set(p.index, {
                minQubit: p.qubits.length ? Math.min(...p.qubits) : 0,
                gateIds: p.gates.map(g => g.id)
            });
        }
        return { partitionMap: map, partitionMeta: meta };
    }, [partitions]);

    const boundaryMap = useMemo(() => {
        const map = new Map<number, PartitionBoundary>();
        if (sequentialCircuit.boundaries) {
            for (const b of sequentialCircuit.boundaries) {
                map.set(b.index, b);
            }
        }
        return map;
    }, [sequentialCircuit.boundaries]);

    const selectedPartition = partitionMap.get(selectedIndex);

    const stats = useMemo(() => {
        const totalGates = partitions.reduce((sum, p) => sum + p.num_gates, 0);
        const avgGatesPerPartition = totalGates / partitions.length;
        const maxGatesInPartition = Math.max(...partitions.map(p => p.num_gates));
        const efficiency = maxPartitionSize ? (avgGatesPerPartition / maxPartitionSize) * 100 : 0;
        return { totalGates, avgGatesPerPartition, maxGatesInPartition, efficiency };
    }, [partitions, maxPartitionSize]);

    useCircuitRenderer({
        svgRef,
        numQubits: globalQubits.length,
        maxDepth: circuit.maxDepth,
        placedGates: circuit.gates,
        draggableGateId: null,
        selectedGateIdsKey: '',
        scrollContainerWidth: null,
        showNestedCircuit: false,
        isExecuting: false,
        handleMouseDown: undefined,
    });

    useEffect(() => {
        // Update highlights with lower priority to avoid blocking UI
        startTransition(() => {
            if (highlightEnabled) {
                const meta = partitionMeta.get(selectedIndex);
                setPartitionHighlightIds(meta?.gateIds || []);
            } else {
                setPartitionHighlightIds([]);
            }
        });

        // Scroll to partition
        if (!scrollAreaRef.current) return;
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        const container = scrollAreaRef.current.closest('.overflow-y-auto') as HTMLElement;
        if (!viewport || !container) return;

        const meta = partitionMeta.get(selectedIndex);
        const topOffset = globalQubitMap[meta?.minQubit ?? 0] * GATE_CONFIG.qubitSpacing;

        if (viewMode === 'sequential') {
            const boundary = boundaryMap.get(selectedIndex);
            viewport.scrollTo({ left: boundary ? boundary.start * GATE_CONFIG.gateSpacing - 50 : 0, behavior: 'smooth' });
        } else {
            viewport.scrollTo({ left: 0, behavior: 'smooth' });
        }
        container.scrollTo({ top: topOffset, behavior: 'smooth' });
    }, [selectedIndex, viewMode, boundaryMap, partitionMeta, globalQubitMap, highlightEnabled, setPartitionHighlightIds, startTransition]);

    useEffect(() => {
        return () => setPartitionHighlightIds([]);
    }, [setPartitionHighlightIds]);

    if (partitions.length === 0) return null;

    return (
        <div className="bg-muted border rounded-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div>
                    <h3 className="text-sm font-semibold">Partition Viewer</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {viewMode === 'sequential' ? (
                            <>{partitions.length} partitions • {stats.totalGates} total gates</>
                        ) : (
                            <>Partition {selectedIndex} • {selectedPartition?.num_gates || 0} gates • {selectedPartition?.num_qubits || 0} qubits</>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Switch
                            id="highlight-toggle"
                            checked={highlightEnabled}
                            onCheckedChange={setPartitionHighlightEnabled}
                            className="scale-75"
                        />
                        <label htmlFor="highlight-toggle" className="text-xs text-muted-foreground cursor-pointer">
                            Highlight Original
                        </label>
                    </div>
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'sequential' | 'individual')} className="w-auto">
                        <TabsList className="h-8">
                            <TabsTrigger value="sequential" className="text-xs">Sequential</TabsTrigger>
                            <TabsTrigger value="individual" className="text-xs">Individual</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <div className="bg-card/95 border-t border-border/50 overflow-y-auto" style={{ maxHeight }}>
                <div className="flex px-4">
                    <div className="flex flex-col mr-4 shrink-0">
                        <div style={{ height: CIRCUIT_CONFIG.headerHeight }} />
                        {globalQubits.map((globalQubit) => (
                            <div
                                key={globalQubit}
                                style={{ height: GATE_CONFIG.qubitSpacing }}
                                className="flex items-center justify-center font-mono text-sm"
                            >
                                q[{globalQubit}]
                            </div>
                        ))}
                        <div style={{ height: CIRCUIT_CONFIG.footerHeight }} />
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        <ScrollArea ref={scrollAreaRef} className="h-full">
                            <div
                                className="relative"
                                style={{ height: canvasHeight }}
                                data-partition-boundaries={viewMode === 'sequential' ? JSON.stringify(sequentialCircuit.boundaries) : undefined}
                                data-partition-map={JSON.stringify(Array.from(partitionMap.entries()).map(([k, v]) => ({ index: k, num_gates: v.num_gates })))}
                            >
                                <svg
                                    ref={svgRef}
                                    style={{ display: 'block', minWidth: canvasWidth, height: canvasHeight }}
                                    className="select-none"
                                />
                                {viewMode === 'sequential' && sequentialCircuit.boundaries?.map((boundary) => {
                                    const partition = partitionMap.get(boundary.index);
                                    const isActive = hoveredPartition === boundary.index || selectedIndex === boundary.index;
                                    return (
                                        <div
                                            key={boundary.index}
                                            className={`absolute top-0 bottom-0 border-l-2 border-r-2 border-dashed pointer-events-none transition-all duration-200 ${
                                                isActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/20 bg-muted/5'
                                            }`}
                                            style={{
                                                left: `${boundary.start * GATE_CONFIG.gateSpacing}px`,
                                                width: `${(boundary.end - boundary.start) * GATE_CONFIG.gateSpacing}px`
                                            }}
                                        >
                                            <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                                                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                            }`}>
                                                P{boundary.index}
                                                {partition && <span className="ml-1.5 opacity-70 font-normal">{partition.num_gates}g</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-3 border-t bg-muted/30">
                <ScrollArea className="w-full">
                    <div className="flex gap-2 pb-2">
                        {partitions.map((partition) => (
                            <Badge
                                key={partition.index}
                                variant={selectedIndex === partition.index ? "default" : "outline"}
                                className={`cursor-pointer transition-all hover:scale-105 ${
                                    selectedIndex === partition.index ? 'shadow-sm' : ''
                                }`}
                                onClick={() => setSelectedIndex(partition.index)}
                                onMouseEnter={() => setHoveredPartition(partition.index)}
                                onMouseLeave={() => setHoveredPartition(null)}
                            >
                                <span className="font-semibold">P{partition.index}</span>
                                <span className="ml-1.5 opacity-70">{partition.num_gates}g • {partition.num_qubits}q</span>
                            </Badge>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            {maxPartitionSize && (
                <div className="grid grid-cols-3 gap-4 px-4 py-2.5 border-t bg-muted/30">
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-muted-foreground">Average Gates</span>
                        <span className="text-sm font-semibold mt-0.5">{stats.avgGatesPerPartition.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-muted-foreground">Max Gates</span>
                        <span className="text-sm font-semibold mt-0.5">{stats.maxGatesInPartition} / {maxPartitionSize}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-muted-foreground">Utilization</span>
                        <span className={`text-sm font-semibold mt-0.5 ${
                            stats.efficiency >= 80 ? 'text-green-600 dark:text-green-400' :
                            stats.efficiency >= 60 ? 'text-blue-600 dark:text-blue-400' :
                            'text-orange-600 dark:text-orange-400'
                        }`}>
                            {stats.efficiency.toFixed(1)}%
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
