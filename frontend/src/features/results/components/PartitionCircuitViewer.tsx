import { useState, useMemo, useRef, useEffect } from 'react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCircuitRenderer } from '@/features/circuit/hooks/useCircuitRenderer';
import { deserializeGateFromAPI } from '@/lib/api/circuits';
import { GATE_CONFIG } from '@/features/gates/constants';
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
    
    const sequentialCircuit = useMemo((): CircuitData => {
        let allGates: Gate[] = [];
        let currentDepth = 0;
        const boundaries: PartitionBoundary[] = [];

        partitions.forEach((partition) => {
            const start = currentDepth;
            const qubitMap: Record<number, number> = {};
            partition.qubits.forEach((global) => { qubitMap[global] = globalQubitMap[global]; });

            partition.gates.forEach((gateData) => {
                const gate = deserializeGateFromAPI({
                    id: gateData.id,
                    depth: currentDepth,
                    gate: { name: gateData.name },
                    target_qubits: gateData.target_qubits.map((q: number) => qubitMap[q]),
                    control_qubits: gateData.control_qubits.map((q: number) => qubitMap[q]),
                    parameters: [],
                }) as Gate;

                allGates.push(gate);
                currentDepth += 1;
            });

            boundaries.push({ index: partition.index, start, end: currentDepth });
        });

        return { gates: allGates, maxDepth: currentDepth, boundaries };
    }, [partitions, globalQubitMap]);

    const individualCircuit = useMemo((): CircuitData => {
        const partition = partitions.find(p => p.index === selectedIndex) || partitions[0];
        if (!partition) return { gates: [], maxDepth: 1 };

        const qubitMap: Record<number, number> = {};
        partition.qubits.forEach((global) => { qubitMap[global] = globalQubitMap[global]; });

        let currentDepth = 0;
        const gates: Gate[] = partition.gates.map((gateData) => {
            const gate = deserializeGateFromAPI({
                id: gateData.id,
                depth: currentDepth,
                gate: { name: gateData.name },
                target_qubits: gateData.target_qubits.map((q: number) => qubitMap[q]),
                control_qubits: gateData.control_qubits.map((q: number) => qubitMap[q]),
                parameters: [],
            }) as Gate;

            currentDepth += 1;
            return gate;
        });

        return { gates, maxDepth: currentDepth };
    }, [partitions, selectedIndex, globalQubitMap]);
    
    const circuit = viewMode === 'sequential' ? sequentialCircuit : individualCircuit;

    const canvasWidth = Math.max(circuit.maxDepth * GATE_CONFIG.gateSpacing + 100, 400);
    const canvasHeight = globalQubits.length * GATE_CONFIG.qubitSpacing + CIRCUIT_CONFIG.headerHeight + CIRCUIT_CONFIG.footerHeight;
    // CircuitCanvas fits 5 qubits at 385px
    const maxHeight = Math.min(canvasHeight, 385);

    const selectedPartition = useMemo(
        () => partitions.find(p => p.index === selectedIndex),
        [partitions, selectedIndex]
    );

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
        if (viewMode !== 'sequential' || !scrollAreaRef.current || !sequentialCircuit.boundaries) return;

        const boundary = sequentialCircuit.boundaries.find(b => b.index === selectedIndex);
        if (!boundary) return;

        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (viewport) {
            viewport.scrollTo({ left: boundary.start * GATE_CONFIG.gateSpacing - 50, behavior: 'smooth' });
        }
    }, [selectedIndex, viewMode, sequentialCircuit.boundaries]);

    if (partitions.length === 0) return null;
    return (
        <div className="bg-muted border rounded-lg">
            {/* Header */}
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
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'sequential' | 'individual')} className="w-auto">
                    <TabsList className="h-8">
                        <TabsTrigger value="sequential" className="text-xs">Sequential</TabsTrigger>
                        <TabsTrigger value="individual" className="text-xs">Individual</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Circuit Canvas */}
            <div className="bg-card/95 border-t border-border/50 overflow-y-auto" style={{ maxHeight }}>
                <div className="flex px-4">
                    {/* Qubit Labels */}
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

                    {/* SVG Circuit with Horizontal Scroll */}
                    <div className="flex-1 overflow-x-auto">
                        <ScrollArea ref={scrollAreaRef} className="h-full">
                            <div className="relative" style={{ height: canvasHeight }}>
                                <svg
                                    ref={svgRef}
                                    style={{ display: 'block', minWidth: canvasWidth, height: canvasHeight }}
                                    className="select-none"
                                />
                                {viewMode === 'sequential' && sequentialCircuit.boundaries?.map((boundary) => {
                                    const partition = partitions.find(p => p.index === boundary.index);
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

            {/* Partition Selection */}
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

            {/* Statistics */}
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
